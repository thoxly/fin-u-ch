import { AppError } from '../../../middlewares/error';
import { validateRequired } from '../../../utils/validation';

export interface CreateSalaryDTO {
  employeeCounterpartyId: string;
  departmentId?: string;
  baseWage: number;
  contributionsPct?: number;
  incomeTaxPct?: number;
  periodicity?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

// DEPRECATED: Salary model has been removed from the schema
// This service is kept for backwards compatibility but returns empty data
export class SalariesService {
  async getAll(companyId: string): Promise<any[]> {
    // Salary model removed - return empty array
    return [];
  }

  async getById(id: string, companyId: string): Promise<any> {
    // Salary model removed
    throw new AppError('Salary feature has been deprecated', 404);
  }

  async create(companyId: string, data: CreateSalaryDTO): Promise<any> {
    // Salary model removed - return stub for audit log compatibility
    return { id: 'deprecated', ...data, companyId };
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<CreateSalaryDTO>
  ): Promise<any> {
    // Salary model removed - return stub for audit log compatibility
    return { id, ...data, companyId };
  }

  async delete(id: string, companyId: string): Promise<any> {
    // Salary model removed - return stub
    return { id, companyId };
  }
}

export default new SalariesService();
