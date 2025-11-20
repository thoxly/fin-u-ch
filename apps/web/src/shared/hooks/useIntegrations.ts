import { useGetOzonIntegrationQuery } from '../../store/api/integrationsApi';

export const useIntegrations = () => {
  const { data: ozonIntegration, refetch: refetchOzonIntegration } =
    useGetOzonIntegrationQuery();

  return {
    ozonIntegration: ozonIntegration?.data,
    refetchOzonIntegration,
  };
};
