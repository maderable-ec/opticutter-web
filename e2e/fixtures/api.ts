import type { Page, Request } from '@playwright/test'
import type { ApiErrorItem, Pagination } from 'src/shared/api/types'

// The whole API, simulated per test. One `page.route` answers every `/api/v1/**` request from the
// stubs a test registers, wrapped in the envelope `httpClient` unwraps (`body.data`, and
// `body.meta.pagination` for a list). A raw object would read as `undefined` and the app would fall
// through to a blank page with no error, which is the most expensive way a stub goes wrong.
//
// A request no stub answers gets a 501 (so React Query settles instead of hanging) and fails the
// test at teardown, naming the method and the path. Never a 401: that one starts the refresh flow.
//
// Only `/api/v1/**`, never `/api/**`: Vite serves the app's own modules under `/src/shared/api/`.

const PREFIX = '/api/v1'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Matcher = string | RegExp
type Data<T> = T | ((req: Request) => T)

interface Reply {
  status: number
  body: unknown
}

interface Stub {
  method: Method
  path: Matcher
  reply: (req: Request) => Reply
}

const envelope = (data: unknown, pagination?: Pagination): Reply => ({
  status: 200,
  body: { data, meta: { requestId: 'e2e', ...(pagination ? { pagination } : {}) } },
})

const resolve = <T>(data: Data<T>, req: Request): T =>
  typeof data === 'function' ? (data as (req: Request) => T)(req) : data

const trimSlash = (p: string) => (p.length > 1 ? p.replace(/\/$/, '') : p)

const matches = (matcher: Matcher, path: string) =>
  typeof matcher === 'string' ? trimSlash(matcher) === trimSlash(path) : matcher.test(path)

export class MockApi {
  private stubs: Stub[] = []
  private seen: { method: Method; path: string; req: Request }[] = []
  /** Requests no stub answered, as `METHOD /path`. */
  readonly unmatched: string[] = []
  /** Requests that tried to reach PostHog. Always aborted. */
  readonly ingest: string[] = []

  private add(method: Method, path: Matcher, reply: (req: Request) => Reply) {
    // Later stubs win, so a test overrides a default by registering the same path again.
    this.stubs.unshift({ method, path, reply })
    return this
  }

  get<T>(path: Matcher, data: Data<T>) {
    return this.add('GET', path, (req) => envelope(resolve(data, req)))
  }

  post<T>(path: Matcher, data: Data<T>) {
    return this.add('POST', path, (req) => envelope(resolve(data, req)))
  }

  put<T>(path: Matcher, data: Data<T>) {
    return this.add('PUT', path, (req) => envelope(resolve(data, req)))
  }

  patch<T>(path: Matcher, data: Data<T>) {
    return this.add('PATCH', path, (req) => envelope(resolve(data, req)))
  }

  delete<T>(path: Matcher, data: Data<T>) {
    return this.add('DELETE', path, (req) => envelope(resolve(data, req)))
  }

  /**
   * A paginated listing: the items plus `meta.pagination`, as `httpClient.list` reads it. `total`
   * can depend on the request, for a screen that counts one listing under several filters.
   */
  list<T>(path: Matcher, items: Data<T[]>, total?: Data<number>) {
    return this.add('GET', path, (req) => {
      const rows = resolve(items, req)
      const url = new URL(req.url())
      const pagination: Pagination = {
        total: total === undefined ? rows.length : resolve(total, req),
        offset: Number(url.searchParams.get('offset') ?? 0),
        limit: Number(url.searchParams.get('limit') ?? 20),
      }
      return envelope(rows, pagination)
    })
  }

  /** An error envelope, as the API sends it (`errors[0].message`, with `field`/`code`). */
  fail(method: Method, path: Matcher, status: number, errors: ApiErrorItem[]) {
    return this.add(method, path, () => ({
      status,
      body: { errors, meta: { requestId: 'e2e' } },
    }))
  }

  /** The requests a stub answered on `method path`, oldest first — to assert what was sent. */
  requests(method: Method, path: Matcher): Request[] {
    return this.seen.filter((s) => s.method === method && matches(path, s.path)).map((s) => s.req)
  }

  async install(page: Page) {
    await page.route('**/ingest/**', async (route) => {
      this.ingest.push(route.request().url())
      await route.abort()
    })
    await page.route('**/api/v1/**', async (route) => {
      const req = route.request()
      const method = req.method() as Method
      const path = new URL(req.url()).pathname.slice(PREFIX.length)
      const stub = this.stubs.find((s) => s.method === method && matches(s.path, path))
      if (!stub) {
        this.unmatched.push(`${method} ${path}`)
        await route.fulfill({
          status: 501,
          json: { errors: [{ message: `e2e: sin stub para ${method} ${path}` }] },
        })
        return
      }
      this.seen.push({ method, path, req })
      const { status, body } = stub.reply(req)
      await route.fulfill({ status, json: body })
    })
  }

  assertAllMatched() {
    if (this.unmatched.length > 0) {
      const list = [...new Set(this.unmatched)].map((u) => `  - ${u}`).join('\n')
      throw new Error(`Peticiones al API sin stub:\n${list}`)
    }
  }
}

/** The stubs every authenticated screen needs, whatever it shows: the header's bell. */
export const withAppDefaults = (api: MockApi) =>
  api
    // Without it `NotificationBell` throws and unmounts the whole tree.
    .get('/notifications/unread-count', { count: 0 })
    .list('/notifications/', [])
