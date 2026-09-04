interface Props {
  message: string
}

export default function SuccessMessage({ message }: Props) {
  return (
    <div
      role="status"
      className="border-l-2 border-gold bg-gold/10 px-5 py-3.5 text-sm text-charcoal-light"
    >
      {message}
    </div>
  )
}