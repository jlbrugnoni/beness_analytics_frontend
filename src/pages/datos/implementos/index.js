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
export default function PropsTable() {
    const router = useRouter();
    const [props, setProps] = useState([]);
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const permissions = usePermissions();
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    useEffect(() => {
        const fetchProps = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/data/props/`, {
                    headers: { Authorization: `Token ${token}` },
                });

                setProps(Array.isArray(response.data.results) ? response.data.results : []);
                setTotalCount(response.data.count || 0);
            } catch (error) {
                console.error("Error fetching props:", error);
                setProps([]);
            }
        };

        if (token) fetchProps();
    }, [token]);

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${backendUrl}/api/data/props/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            setProps((prevProps) => prevProps.filter((prop) => prop.id !== id));
        } catch (error) {
            console.error("Error deleting prop:", error);
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
                <title>Beness App | Implementos</title>
            </Head>
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>Implementos</h1>
                {permissions.includes("core_data.add_prop") &&
                    <Button className={styles.addButton} onClick={() => router.push("implementos/add")}>
                        + Añadir
                    </Button>
                }

            </div>
            <TableComponent
                data={props}
                entityName="Implementos"
                columns={[
                    { label: "Nombre", field: "name" },
                    // { label: "Descripción", field: "description" },
                    { label: "Creado Por", field: "created_by", className: responsiveStyles.hideOnMobile },
                ]}
                onAdd={() => router.push("implementos/add")}
                onEdit={permissions.includes("core_data.change_prop") ? (id) => router.push(`/datos/implementos/edit?id=${id}`) : null}
                onDelete={permissions.includes("core_data.delete_prop") ? handleDelete : null}

                totalCount={totalCount}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}

            />
        </MainPage>
    );
}