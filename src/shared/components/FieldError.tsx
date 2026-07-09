interface FieldErrorProps {
  name: string
  errors: Record<string, string>
}

/** Inline validation message for a single input, shown only when present. */
const FieldError = ({ name, errors }: FieldErrorProps) =>
  errors[name] ? <div className="text-danger small mt-1">{errors[name]}</div> : null

export default FieldError
