export const capabilityNames = [
    "can_view_money", "can_upload_data", "can_edit_data", "can_reset_data",
    "can_manage_users", "can_view_admin_logs", "can_view_finance", "can_import_finance",
    "can_import_finance_migration", "can_reopen_finance", "can_edit_finance", "can_manage_finance_settings",
    "can_close_finance_periods", "can_export_finance", "can_view_finance_bank_accounts",
    "can_view_sensitive_finance",
];

export const financeCapabilityNames = capabilityNames.slice(6);
export const emptyFinanceCapabilities = Object.fromEntries(financeCapabilityNames.map((name) => [name, false]));
export const capabilityFormFields = (t) => capabilityNames.map((name) => ({
    label: t(`access.${name}`), name, type: "boolean",
}));
export const financeCapabilityValues = (data) => Object.fromEntries(
    financeCapabilityNames.map((name) => [name, Boolean(data[name])]),
);
