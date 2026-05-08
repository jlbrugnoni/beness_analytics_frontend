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
export default function MachinesTable() {
    const router = useRouter();
    const [machines, setMachines] = useState([]);
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const permissions = usePermissions();
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    useEffect(() => {
        const fetchMachines = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/data/machines/`, {
                    headers: { "Authorization": `Token ${token}` },
                });

                setMachines(Array.isArray(response.data.results) ? response.data.results : []);
                setTotalCount(response.data.count || 0);
            } catch (error) {
                console.error("Error fetching machines:", error);
                setMachines([]);
            }
        };

        if (token) fetchMachines();
    }, [token]);

    const handleDelete = async (id) => {
        await axios.delete(`${backendUrl}/api/data/machines/${id}/`, {
            headers: { "Authorization": `Token ${token}` },
        });
        setMachines(machines.filter((machine) => machine.id !== id));
    };
    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); 
    };
    if (permissions == null) return null;
    return (
        <MainPage>
            <Head>
                <title>Beness App | Máquinas</title>
            </Head>
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>Máquinas</h1>
                {permissions.includes("core_data.add_machine") &&
                    <Button className={styles.addButton} onClick={() => router.push("maquinas/add")}>
                        + Añadir
                    </Button>
                }

            </div>
            <TableComponent
                data={machines}
                entityName="Máquinas"
                columns={[
                    { label: "Nombre", field: "name" },
                    // { label: "Descripción", field: "description" },
                    { label: "Creado Por", field: "created_by", className: responsiveStyles.hideOnMobile },
                ]}
                onAdd={() => router.push("maquinas/add")}
                onEdit={permissions.includes("core_data.change_machine") ? (id) => router.push(`/datos/maquinas/edit?id=${id}`) : null}
                onDelete={permissions.includes("core_data.delete_machine") ? handleDelete : null}

                totalCount={totalCount}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}

            />
        </MainPage>
    );
}