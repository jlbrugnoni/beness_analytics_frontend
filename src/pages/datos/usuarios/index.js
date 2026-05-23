import MainPage from "../../mainPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import TableComponent from "@/components/TableComponent";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/tablePage.module.css";
import responsiveStyles from "@/styles/responsive.module.css";;
import Button from "@mui/material/Button";
import Head from "next/head";
import usePermissions from "@/hooks/usePermissions";
import useAccess from "@/hooks/useAccess";
export default function UsersTable() {
    const router = useRouter();
    const [usersData, setUsersData] = useState([]);
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const permissions = usePermissions();
    const access = useAccess();
    const canManageUsers = Boolean(access.capabilities?.can_manage_users);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    useEffect(() => {
        const fetchUsersData = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/data/users/`, {
                    headers: { Authorization: `Token ${token}` },
                });
                setUsersData(response.data);                
                setTotalCount(response.data.length || 0);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };
        if (token) fetchUsersData();
    }, [token]);

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${backendUrl}/api/data/users/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            setUsersData(usersData.filter((user) => user.id !== id));
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };
    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // ✅ Reset to first page when changing page size
    };

    if (permissions == null) return null;
    return (
        <MainPage>
            <Head>
                <title>Beness App | Usuarios</title>
            </Head>
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>Usuarios</h1>
                {canManageUsers &&
                    <Button className={styles.addButton} onClick={() => router.push("usuarios/add")}>
                        + Añadir
                    </Button>
                }

            </div>
            <TableComponent
                data={usersData}
                entityName="Usuarios"
                columns={[
                    {
                        label: "Email",
                        field: "email",
                        className: responsiveStyles.hideOnMobile,
                        render: (row) => row.is_superuser ? `${row.email} (SU)` : row.email,
                    },
                    { label: "Nombre", field: "first_name", className: responsiveStyles.hideOnMobile },
                    { label: "Apellido", field: "last_name", className: responsiveStyles.hideOnMobile },
                    { label: "Grupo", field: "group_name", className: responsiveStyles.hideOnMobile, render: (row) => row.is_superuser ? "Superuser" : row.group_name || "Sin grupo" },
                    {
                        label: "Datos",
                        field: "info",
                        className: responsiveStyles.showOnlyOnMobile,
                        render: (row) => (
                            <div>
                                <div><strong>email:</strong> {row.is_superuser ? `${row.email} (SU)` : row.email}</div>
                                <div><strong>Nombre:</strong> {row.first_name}</div>
                                <div><strong>Apellido:</strong> {row.last_name}</div>
                                <div><strong>Grupo:</strong> {row.is_superuser ? "Superuser" : row.group_name || "Sin grupo"}</div>
                            </div>
                        )
                    },
                ]}
                onAdd={() => router.push("usuarios/add")}
                onInfo={(id) => router.push(`/datos/usuarios/info?id=${id}`)}
                onEdit={canManageUsers ? (id) => router.push(`/datos/usuarios/edit?id=${id}`) : null}
                onDelete={canManageUsers ? handleDelete : null}
                canDeleteRow={(row) => !row.is_superuser}

                totalCount={totalCount} 
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
            />
        </MainPage>
    );
}
