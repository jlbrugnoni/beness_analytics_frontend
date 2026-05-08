import MainPage from "@/pages/mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import ExerciseFormComponent from "@/components/ExerciseFormComponent";
import { useEffect, useState } from "react";
import Head from "next/head";

const AddExercise = () => {
    const router = useRouter();
    const token = useFetchToken();
    const userData = useFetchUserInfo();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    // ✅ Fetch all dropdown data (positions, props, machines) only once
    const [dropdownData, setDropdownData] = useState({ positions: [], props: [], machines: [], tags: [] });

    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [positionsRes, propsRes, machinesRes, tagsRes] = await Promise.all([
                    axios.get(`${backendUrl}/api/data/all_positions/`, { headers: { Authorization: `Token ${token}` } }),
                    axios.get(`${backendUrl}/api/data/all_props/`, { headers: { Authorization: `Token ${token}` } }),
                    axios.get(`${backendUrl}/api/data/all_machines/`, { headers: { Authorization: `Token ${token}` } }),
                    axios.get(`${backendUrl}/api/data/all_tags/`, { headers: { Authorization: `Token ${token}` } })
                ]);

                setDropdownData({
                    positions: positionsRes.data || [],
                    props: propsRes.data || [],
                    machines: machinesRes.data || [],
                    tags: tagsRes.data || [],
                });
            } catch (error) {
                console.error("Error fetching dropdown data:", error);
            }
        };

        if (token) fetchDropdownData();
    }, [token]);

    return (
        <MainPage>
            <Head>
                <title>Beness App | Añadir Ejercicio</title>
            </Head>

            <ExerciseFormComponent
                actionName="Añadir"
                entityName="Ejercicio"
                initialData={{
                    name: "", description: "", position: "", prop: "", machine: "",
                    group: "", instructions: "", box: "", unilateral: false, head_position: "",
                    video: "", image: "", // image lo dejamos por compatibilidad
                    video_public_id: "", gif_url: "", gif_public_id: "",
                    tags: []
                }}
                onSubmit={async (formData) => {
                    await axios.post(`${backendUrl}/api/data/exercises/`, { ...formData, created_by: userData.email }, { headers: { Authorization: `Token ${token}` } });
                    router.push("/ejercicios");
                }}
                onCancel={() => router.push("/ejercicios")}
                positions={dropdownData.positions}
                props={dropdownData.props}
                machines={dropdownData.machines}
                tags={dropdownData.tags}
            />
            
            {/* <ExerciseFormComponent
                actionName="Añadir"
                entityName="Ejercicio"
                initialData={{ name: "", description: "", position: "", prop: "", machine: "", group: "", instructions: "", box: "", unilateral_bilateral: false, head_position: "", video: "", image: "" }}
                onSubmit={async (formData) => {
                    await axios.post(`${backendUrl}/api/data/exercises/`, { ...formData, created_by: userData.email }, { headers: { Authorization: `Token ${token}` } });
                    router.push("/ejercicios");
                }}
                onCancel={() => router.push("/ejercicios")}
                positions={dropdownData.positions}
                props={dropdownData.props}
                machines={dropdownData.machines}
                tags={dropdownData.tags}
            /> */}
        </MainPage>
    );
};

export default AddExercise;
