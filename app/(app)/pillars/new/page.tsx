import { PageHeader } from "@/components/layout/PageHeader";
import { PillarForm } from "@/components/pillars/PillarForm";

export default function NewPillarPage() {
  return (
    <div>
      <PageHeader title="Novo pilar" backHref="/pillars" />
      <PillarForm />
    </div>
  );
}
