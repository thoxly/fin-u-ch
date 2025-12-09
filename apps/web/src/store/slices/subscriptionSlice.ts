import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { config } from '../../shared/config/env';
import type { RootState } from '../store';

export interface SubscriptionLimits {
  maxUsers: number;
  features: string[];
}

export interface UserLimitInfo {
  current: number;
  max: number | null;
  remaining: number | null;
  isUnlimited: boolean;
}

export interface SubscriptionData {
  plan: 'START' | 'TEAM' | 'BUSINESS';
  status: string;
  startDate: string;
  endDate: string | null;
  trialEndsAt: string | null;
  promoCode: string | null;
  limits: SubscriptionLimits;
  userLimit: UserLimitInfo;
}

interface SubscriptionState {
  data: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  activatingPromo: boolean;
}

const initialState: SubscriptionState = {
  data: null,
  loading: false,
  error: null,
  activatingPromo: false,
};

/**
 * Async thunk для загрузки текущей подписки
 */
export const fetchSubscription = createAsyncThunk(
  'subscription/fetchSubscription',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const token = state.auth.accessToken;

      const response = await fetch(`${config.apiUrl}/subscription/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Failed to fetch subscription');
      }

      return await response.json();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch subscription';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Async thunk для активации промокода
 */
export const activatePromoThunk = createAsyncThunk(
  'subscription/activatePromo',
  async (promoCode: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const token = state.auth.accessToken;

      const response = await fetch(
        `${config.apiUrl}/subscription/activate-promo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ promoCode }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(
          error.message || 'Failed to activate promo code'
        );
      }

      return await response.json();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to activate promo code';
      return rejectWithValue(errorMessage);
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearSubscriptionError: (state) => {
      state.error = null;
    },
    resetSubscription: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
      state.activatingPromo = false;
    },
    setSubscription: (state, action: PayloadAction<SubscriptionData>) => {
      state.data = action.payload;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchSubscription
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // activatePromoThunk
    builder
      .addCase(activatePromoThunk.pending, (state) => {
        state.activatingPromo = true;
        state.error = null;
      })
      .addCase(activatePromoThunk.fulfilled, (state, action) => {
        state.activatingPromo = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(activatePromoThunk.rejected, (state, action) => {
        state.activatingPromo = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSubscriptionError, resetSubscription, setSubscription } =
  subscriptionSlice.actions;

export default subscriptionSlice.reducer;
