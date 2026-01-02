import { useAuth } from "@/providers/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useClinicScopeContext } from "@/providers/ClinicScopeProvider";

export const useClinicScope = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { clinicIdOverride, staffLabelOverride } = useClinicScopeContext();

  const clinicId = clinicIdOverride ?? profile?.clinic_id ?? null;
  const staffLabel =
    staffLabelOverride ?? profile?.full_name ?? profile?.email ?? user?.email ?? "Staff";

  return { clinicId, staffLabel, profile, user };
};