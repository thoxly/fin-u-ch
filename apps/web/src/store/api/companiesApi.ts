import { apiSlice } from './apiSlice';

export interface UiSettings {
  navigationIcons?: Record<string, string>;
  [key: string]: unknown;
}

export const companiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUiSettings: builder.query<UiSettings, void>({
      query: () => '/companies/ui-settings',
      providesTags: ['User'],
    }),
    updateUiSettings: builder.mutation<UiSettings, UiSettings>({
      query: (settings) => ({
        url: '/companies/ui-settings',
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { useGetUiSettingsQuery, useUpdateUiSettingsMutation } =
  companiesApi;
