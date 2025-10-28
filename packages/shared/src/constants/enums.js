"use strict";
/**
 * Enums for domain model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticleIndicator = exports.BudgetStatus = exports.PlanStatus = exports.Periodicity = exports.CounterpartyCategory = exports.Activity = exports.OperationType = void 0;
var OperationType;
(function (OperationType) {
    OperationType["INCOME"] = "income";
    OperationType["EXPENSE"] = "expense";
    OperationType["TRANSFER"] = "transfer";
})(OperationType || (exports.OperationType = OperationType = {}));
var Activity;
(function (Activity) {
    Activity["OPERATING"] = "operating";
    Activity["INVESTING"] = "investing";
    Activity["FINANCING"] = "financing";
})(Activity || (exports.Activity = Activity = {}));
var CounterpartyCategory;
(function (CounterpartyCategory) {
    CounterpartyCategory["SUPPLIER"] = "supplier";
    CounterpartyCategory["CUSTOMER"] = "customer";
    CounterpartyCategory["GOV"] = "gov";
    CounterpartyCategory["EMPLOYEE"] = "employee";
    CounterpartyCategory["OTHER"] = "other";
})(CounterpartyCategory || (exports.CounterpartyCategory = CounterpartyCategory = {}));
var Periodicity;
(function (Periodicity) {
    Periodicity["NONE"] = "none";
    Periodicity["DAILY"] = "daily";
    Periodicity["WEEKLY"] = "weekly";
    Periodicity["MONTHLY"] = "monthly";
    Periodicity["QUARTERLY"] = "quarterly";
    Periodicity["SEMIANNUAL"] = "semiannual";
    Periodicity["ANNUAL"] = "annual";
})(Periodicity || (exports.Periodicity = Periodicity = {}));
var PlanStatus;
(function (PlanStatus) {
    PlanStatus["ACTIVE"] = "active";
    PlanStatus["PAUSED"] = "paused";
    PlanStatus["ARCHIVED"] = "archived";
})(PlanStatus || (exports.PlanStatus = PlanStatus = {}));
var BudgetStatus;
(function (BudgetStatus) {
    BudgetStatus["ACTIVE"] = "active";
    BudgetStatus["ARCHIVED"] = "archived";
})(BudgetStatus || (exports.BudgetStatus = BudgetStatus = {}));
var ArticleIndicator;
(function (ArticleIndicator) {
    // For expense
    ArticleIndicator["AMORTIZATION"] = "amortization";
    ArticleIndicator["DIVIDENDS"] = "dividends";
    ArticleIndicator["TAXES"] = "taxes";
    ArticleIndicator["OPEX"] = "opex";
    ArticleIndicator["INTEREST"] = "interest";
    ArticleIndicator["OTHER"] = "other";
    ArticleIndicator["COGS"] = "cogs";
    ArticleIndicator["LOAN_PRINCIPAL"] = "loan_principal";
    ArticleIndicator["PAYROLL"] = "payroll";
    // For income
    ArticleIndicator["REVENUE"] = "revenue";
    ArticleIndicator["OTHER_INCOME"] = "other_income";
})(ArticleIndicator || (exports.ArticleIndicator = ArticleIndicator = {}));
//# sourceMappingURL=enums.js.map