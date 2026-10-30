const routePermissions = {
    "/finance/category-catalog": { finance: true, capability: "can_import_finance_migration" },
    "/finance/closures": { finance: true, capability: "can_view_finance_bank_accounts" },
    "/finance/imports": { finance: true, capability: "can_view_finance_bank_accounts" },
    "/finance/configuration": { finance: true, capability: "can_manage_finance_settings" },
    "/finance": { finance: true },
    "/settings/groups": { capability: "can_manage_users" },
    "/uploads/purchase-matches": { capability: "can_upload_data" },
    "/uploads": { capability: "can_upload_data" },
    "/imported": { capability: "can_upload_data" },
    "/datos/usuarios": { capability: "can_manage_users" },
    "/datos/usuarios/edit": { capability: "can_manage_users" },
    "/datos/usuarios/add": { capability: "can_manage_users" },
    "/settings/login-logs": { capability: "can_view_admin_logs" },
    "/schedule/templates": { capability: "can_edit_data" },
    "/schedule/unmatched-attendance": { capability: "can_edit_data" },
};

export default routePermissions;
