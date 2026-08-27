interface Props {
  message: string
}

export default function SuccessMessage({ message }: Props) {
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm" role="status">
      {message}
    </div>
  )
}
