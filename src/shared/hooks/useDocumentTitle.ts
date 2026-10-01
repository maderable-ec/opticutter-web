import { useEffect } from 'react'

// The browser tab's title. Each screen sets its own (the shell from the breadcrumb, `pageTitle`;
// the public pages by hand): a shared «Maderable» made two tabs impossible to tell apart, and a
// screen reader announced the same name on every navigation.
export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    document.title = title
  }, [title])
}
