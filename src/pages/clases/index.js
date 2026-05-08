import MainPage from "@/pages/mainPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import TableComponent from "@/components/TableComponent";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/tablePage.module.css";
import responsiveStyles from "@/styles/responsive.module.css";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Head from "next/head";
import usePermissions from "@/hooks/usePermissions";

export default function RoutinesTable() {

    const router = useRouter();
    const [routines, setRoutines] = useState([]);
    const [totalCount, setTotalCount] = useState(0); // ✅ Store total count from API
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15); // ✅ Default matches Django settings

    const [selectedTab, setSelectedTab] = useState(0);
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [selectedDescription, setSelectedDescription] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const permissions = usePermissions();

    const fetchRoutines = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/data/routines_info/`, {
                headers: { Authorization: `Token ${token}` },
                params: {
                    on_edit: selectedTab === 0 ? "true" : "false",
                    page: page + 1, // Django uses 1-based indexing
                    page_size: rowsPerPage
                }
            });

            setRoutines(response.data.results || []);
            setTotalCount(response.data.count || 0); // ✅ Set total items count for pagination
        } catch (error) {
            console.error("Error fetching routines:", error);
            setRoutines([]);
        }
    };

    useEffect(() => {
        if (token) fetchRoutines();
    }, [token, selectedTab, page, rowsPerPage]); // ✅ Re-fetch when pagination or filters change

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
                <title>Beness App | Clases</title>
            </Head>
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>Clases</h1>
                {permissions.includes("core_data.add_routine") && (
                    <Button className={styles.addButton} onClick={() => router.push("clases/add")}>
                        + Añadir
                    </Button>
                )}

            </div>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
                    <Tab label="Clases en Edición" />
                    <Tab label="Clases Listas" />
                </Tabs>
            </Box>
            <div className={responsiveStyles.tableWrapper}>
                <TableComponent
                    data={routines}
                    entityName={selectedTab === 0 ? "Clases en Edición" : "Clases Listas"}
                    columns={[
                        { label: "Nombre", field: "name" },

                        {
                            label: "Duración",
                            field: "duration",
                            className: responsiveStyles.hideOnMobile
                        },
                        {
                            label: "Ejercicios",
                            field: "number_exercises",
                            className: responsiveStyles.hideOnMobile
                        },
                        {
                            label: "Máquinas",
                            field: "machine_names",
                            className: responsiveStyles.hideOnMobile,
                            render: (row) => row.machine_names?.join(", ")
                        },
                        {
                            label: "Implemento",
                            field: "prop",
                            className: responsiveStyles.hideOnMobile
                        },

                        {
                            label: "Datos",
                            field: "info",
                            className: responsiveStyles.showOnlyOnMobile,
                            render: (row) => (
                                <div>
                                    <div><strong>Duración:</strong> {row.duration} min</div>
                                    <div><strong>Ejercicios:</strong> {row.number_exercises}</div>
                                    <div><strong>Máquinas:</strong> {row.machine_names?.join(", ")}</div>
                                    <div><strong>Implemento:</strong> {row.prop}</div>
                                </div>
                            )
                        },

                        { label: "Creado Por", field: "created_by", className: responsiveStyles.hideOnMobile }
                    ]}
                    onEdit={permissions.includes("core_data.change_routine") ? (id) => router.push(`/clases/edit?id=${id}`) : null}
                    onDelete={permissions.includes("core_data.delete_routine") ? async (id) => {
                        try {
                            await axios.delete(`${backendUrl}/api/data/routines/${id}/`, {
                                headers: { "Authorization": `Token ${token}` },
                            });
                            fetchRoutines();
                        } catch (error) {
                            console.error("Error deleting routine:", error);
                        }
                    } : null}
                    onEditRoutine={permissions.includes("core_data.change_routine") ? (id) => router.push(`/clases/edit-routine?id=${id}`) : null}
                    totalCount={totalCount} // ✅ Pass total count for pagination
                    page={page} // ✅ Pass current page
                    rowsPerPage={rowsPerPage} // ✅ Pass rows per page
                    onPageChange={handlePageChange} // ✅ Handle page change
                    onRowsPerPageChange={handleRowsPerPageChange} // ✅ Handle page size change
                />
            </div>
        </MainPage>
    );
}
