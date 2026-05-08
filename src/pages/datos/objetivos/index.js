import MainPage from "../../mainPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import TableComponent from "@/components/TableComponent";
import useFetchToken from "@/components/useFetchUserId";
import Head from "next/head";
import responsiveStyles from "@/styles/responsive.module.css";;
import usePermissions from "@/hooks/usePermissions";
const ObjectivesTable = () => {
    const router = useRouter();
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [objectives, setObjectives] = useState([]);
    const permissions = usePermissions();
    // Fetch objectives
    useEffect(() => {
        const fetchObjectives = async () => {
            try {
                const response = await axios.get(`${backendUrl}/api/data/objectives/`, {
                    headers: { Authorization: `Token ${token}` },
                });
                setObjectives(Array.isArray(response.data.results) ? response.data.results : []);
            } catch (error) {
                console.error("Error fetching objectives:", error);
                setObjectives([]);
            }
        };

        if (token) fetchObjectives();
    }, [token]);

    // Handle delete
    const handleDelete = async (id) => {
        try {
            await axios.delete(`${backendUrl}/api/data/objectives/${id}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            setObjectives((prevObjectives) => prevObjectives.filter((obj) => obj.id !== id));
        } catch (error) {
            console.error("Error deleting objective:", error);
        }
    };
    if (permissions == null) return null;
    return (
        <MainPage>
            <Head>
                <title>Beness App | Objetivos</title>
            </Head>
            <TableComponent
                entityName="Objetivos"
                data={objectives}
                columns={[
                    { label: "Nombre", field: "name" },
                    { label: "Descripción", field: "description" },
                    { label: "Creado Por", field: "created_by" },
                ]}
                onEdit={permissions.includes("core_data.change_objective") ? (id) => router.push(`/datos/objetivos/edit?id=${id}`) : null}
                onDelete={permissions.includes("core_data.delete_objective") ? handleDelete : null}
                onAdd={() => router.push("/datos/objetivos/add")}
            />
        </MainPage>
    );
};

export default ObjectivesTable;