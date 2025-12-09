import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';

/**
 * Типизированный useDispatch
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Типизированный useSelector
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
