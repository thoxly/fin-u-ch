import { apiSlice } from './apiSlice';
import type {
  Article,
  Account,
  Department,
  Counterparty,
  Deal,
  Salary,
} from '@shared/types/catalogs';

export const catalogsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Articles
    getArticles: builder.query<Article[], void>({
      query: () => '/articles',
      providesTags: ['Article'],
    }),
    createArticle: builder.mutation<Article, Partial<Article>>({
      query: (data) => ({
        url: '/articles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Article'],
    }),
    updateArticle: builder.mutation<
      Article,
      { id: string; data: Partial<Article> }
    >({
      query: ({ id, data }) => ({
        url: `/articles/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Article'],
    }),
    deleteArticle: builder.mutation<void, string>({
      query: (id) => ({
        url: `/articles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Article'],
    }),

    // Accounts
    getAccounts: builder.query<Account[], void>({
      query: () => '/accounts',
      providesTags: ['Account'],
    }),
    createAccount: builder.mutation<Account, Partial<Account>>({
      query: (data) => ({
        url: '/accounts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Account'],
    }),
    updateAccount: builder.mutation<
      Account,
      { id: string; data: Partial<Account> }
    >({
      query: ({ id, data }) => ({
        url: `/accounts/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Account'],
    }),
    deleteAccount: builder.mutation<void, string>({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Account'],
    }),

    // Departments
    getDepartments: builder.query<Department[], void>({
      query: () => '/departments',
      providesTags: ['Department'],
    }),
    createDepartment: builder.mutation<Department, Partial<Department>>({
      query: (data) => ({
        url: '/departments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),
    updateDepartment: builder.mutation<
      Department,
      { id: string; data: Partial<Department> }
    >({
      query: ({ id, data }) => ({
        url: `/departments/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),
    deleteDepartment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Department'],
    }),

    // Counterparties
    getCounterparties: builder.query<Counterparty[], void>({
      query: () => '/counterparties',
      providesTags: ['Counterparty'],
    }),
    createCounterparty: builder.mutation<Counterparty, Partial<Counterparty>>({
      query: (data) => ({
        url: '/counterparties',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Counterparty'],
    }),
    updateCounterparty: builder.mutation<
      Counterparty,
      { id: string; data: Partial<Counterparty> }
    >({
      query: ({ id, data }) => ({
        url: `/counterparties/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Counterparty'],
    }),
    deleteCounterparty: builder.mutation<void, string>({
      query: (id) => ({
        url: `/counterparties/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Counterparty'],
    }),

    // Deals
    getDeals: builder.query<Deal[], void>({
      query: () => '/deals',
      providesTags: ['Deal'],
    }),
    createDeal: builder.mutation<Deal, Partial<Deal>>({
      query: (data) => ({
        url: '/deals',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Deal'],
    }),
    updateDeal: builder.mutation<Deal, { id: string; data: Partial<Deal> }>({
      query: ({ id, data }) => ({
        url: `/deals/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Deal'],
    }),
    deleteDeal: builder.mutation<void, string>({
      query: (id) => ({
        url: `/deals/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Deal'],
    }),

    // Salaries
    getSalaries: builder.query<Salary[], void>({
      query: () => '/salaries',
      providesTags: ['Salary'],
    }),
    createSalary: builder.mutation<Salary, Partial<Salary>>({
      query: (data) => ({
        url: '/salaries',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Salary'],
    }),
    updateSalary: builder.mutation<
      Salary,
      { id: string; data: Partial<Salary> }
    >({
      query: ({ id, data }) => ({
        url: `/salaries/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Salary'],
    }),
    deleteSalary: builder.mutation<void, string>({
      query: (id) => ({
        url: `/salaries/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Salary'],
    }),
  }),
});

export const {
  useGetArticlesQuery,
  useCreateArticleMutation,
  useUpdateArticleMutation,
  useDeleteArticleMutation,
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetCounterpartiesQuery,
  useCreateCounterpartyMutation,
  useUpdateCounterpartyMutation,
  useDeleteCounterpartyMutation,
  useGetDealsQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useGetSalariesQuery,
  useCreateSalaryMutation,
  useUpdateSalaryMutation,
  useDeleteSalaryMutation,
} = catalogsApi;
