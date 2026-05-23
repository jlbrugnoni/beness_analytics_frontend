const routePermissions = {
    "/uploads": { capability: "can_upload_data" },
    "/datos/usuarios": { capability: "can_manage_users" },
    "/datos/usuarios/edit": { capability: "can_manage_users" },
    "/datos/usuarios/add": { capability: "can_manage_users" },
    "/settings/login-logs": { capability: "can_view_admin_logs" },
    "/schedule/templates": { capability: "can_edit_data" },
    "/schedule/unmatched-attendance": { capability: "can_edit_data" },
};

export default routePermissions;
