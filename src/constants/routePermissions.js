const routePermissions = {
    // EJERCICIOS
    "/ejercicios": "core_data.view_exercise",
    "/ejercicios/edit": "core_data.change_exercise",
    "/ejercicios/add": "core_data.add_exercise",

    // CLASES
    "/clases": "core_data.view_routine",
    "/clases/edit": "core_data.change_routine",
    "/clases/add": "core_data.add_routine",

    // POSICIONES
    "/datos/posiciones": "core_data.view_position",
    "/datos/posiciones/edit": "core_data.change_position",
    "/datos/posiciones/add": "core_data.add_position",

    // IMPLEMENTOS
    "/datos/implementos": "core_data.view_prop",
    "/datos/implementos/edit": "core_data.change_prop",
    "/datos/implementos/add": "core_data.add_prop",

    // MÁQUINAS
    "/datos/maquinas": "core_data.view_machine",
    "/datos/maquinas/edit": "core_data.change_machine",
    "/datos/maquinas/add": "core_data.add_machine",

    // USUARIOS
    "/datos/usuarios": "core_data.view_customuser",
    "/datos/usuarios/edit": "core_data.change_customuser",
    "/datos/usuarios/add": "core_data.add_customuser",
};

export default routePermissions;
