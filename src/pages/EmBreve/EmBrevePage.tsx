export default function EmBrevePage({ titulo }: { titulo: string }) {
  return (
    <div className="rounded border border-[#CFCCC5] bg-papel p-4">
      <p className="font-disp text-xl">{titulo}</p>
      <p className="mt-2 text-sm text-aco">Esta tela entra nas próximas etapas — ainda não está ligada.</p>
    </div>
  )
}
