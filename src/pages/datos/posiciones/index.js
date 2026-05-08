import MainPage from "../../mainPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import TableComponent from "@/components/TableComponent";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/tablePage.module.css"
import responsiveStyles from "@/styles/responsive.module.css";;
import Button from "@mui/material/Button";
import Head from "next/head";
import usePermissions from "@/hooks/usePermissions";
export default function PositionsTable() {
    const router = useRouter();
    const [positions, setPositions] = useState([]);
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const permissions = usePermissions();
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    useEffect(() => {
        const fetchPositions = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/data/positions/`, {
                    headers: { Authorization: `Token ${token}` },
                });

                setPositions(Array.isArray(response.data.results) ? response.data.results : []);
                setTotalCount(response.data.count || 0);
            } catch (error) {
                console.error("Error fetching positions:", error);
                setPositions([]);
            }
        };

        if (token) fetchPositions();
    }, [token]);

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${backendUrl}/api/data/positions/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            setPositions((prevPositions) => prevPositions.filter((position) => position.id !== id));
        } catch (error) {
            console.error("Error deleting position:", error);
        }
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
                <title>Beness App | Posiciones</title>
            </Head>
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>Posiciones</h1>
                {permissions.includes("core_data.add_position") &&
                    <Button className={styles.addButton} onClick={() => router.push("posiciones/add")}>
                        + Añadir
                    </Button>
                }

            </div>
            <TableComponent
                data={positions}
                entityName="Posiciones"
                columns={[
                    { label: "Nombre", field: "name" },
                    // { label: "Descripción", field: "description" },
                    { label: "Creado Por", field: "created_by", className: responsiveStyles.hideOnMobile }
                ]}
                onAdd={() => router.push("posiciones/add")}
                onEdit={permissions.includes("core_data.change_position") ? (id) => router.push(`/datos/posiciones/edit?id=${id}`) : null}
                onDelete={permissions.includes("core_data.delete_position") ? handleDelete : null}

                totalCount={totalCount}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}

            />
        </MainPage>
    );
}