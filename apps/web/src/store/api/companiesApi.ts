import { apiSlice } from './apiSlice';

export interface NavigationIcons {
  [navigationItemName: string]: string;
}

export interface Company {
  id: string;
  name: string;
  currencyBase: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  currencyBase?: string;
}

export interface UiSettings {
  navigationIcons?: NavigationIcons;
  // Future UI settings can be added here
  // theme?: 'light' | 'dark';
  // sidebarCollapsed?: boolean;
}

export const companiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompany: builder.query<Company, void>({
      query: () => '/companies/me',
      providesTags: ['User'],
    }),
    updateCompany: builder.mutation<Company, UpdateCompanyRequest>({
      query: (data) => ({
        url: '/companies/me',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
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

export const {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
  useGetUiSettingsQuery,
  useUpdateUiSettingsMutation,
} = companiesApi;
