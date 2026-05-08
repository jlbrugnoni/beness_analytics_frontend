// import { useEffect, useState } from "react";
// import MainPage from "@/pages/mainPage";
// import { useRouter } from "next/router";
// import axios from "axios";
// import useFetchToken from "@/components/useFetchUserId";
// import useFetchUserInfo from "@/components/useFetchUserInfo";
// import ExerciseFormComponent from "@/components/ExerciseFormComponent";
// import Head from "next/head";

// const EditExercise = () => {
//     const router = useRouter();
//     const { id } = router.query;
//     const token = useFetchToken();
//     const userData = useFetchUserInfo();
//     const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

//     // ✅ State for form data and dropdowns
//     const [exerciseData, setExerciseData] = useState(null);
//     const [dropdownData, setDropdownData] = useState({ positions: [], props: [], machines: [], tags: [] });
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     // ✅ Fetch all dropdown data (positions, props, machines) ONCE
//     useEffect(() => {
//         const fetchDropdownData = async () => {
//             try {
//                 const [positionsRes, propsRes, machinesRes, tagsRes] = await Promise.all([
//                     axios.get(`${backendUrl}/api/data/all_positions/`, { headers: { Authorization: `Token ${token}` } }),
//                     axios.get(`${backendUrl}/api/data/all_props/`, { headers: { Authorization: `Token ${token}` } }),
//                     axios.get(`${backendUrl}/api/data/all_machines/`, { headers: { Authorization: `Token ${token}` } }),
//                     axios.get(`${backendUrl}/api/data/all_tags/`, { headers: { Authorization: `Token ${token}` } })
//                 ]);

//                 setDropdownData({
//                     positions: positionsRes.data || [],
//                     props: propsRes.data || [],
//                     machines: machinesRes.data || [],
//                     tags: tagsRes.data || [],
//                 });
//             } catch (error) {
//                 console.error("Error fetching dropdown data:", error);
//                 setError("Error cargando opciones.");
//             }
//         };

//         if (token) fetchDropdownData();
//     }, [token]);

//     // ✅ Fetch the exercise data when `id` is available
//     useEffect(() => {
//         if (!id || !token) return;

//         const fetchExerciseData = async () => {
//             setLoading(true);
//             try {
//                 const exerciseRes = await axios.get(`${backendUrl}/api/data/exercises/${id}/`, {
//                     headers: { Authorization: `Token ${token}` },
//                 });

//                 setExerciseData(exerciseRes.data);
//             } catch (error) {
//                 console.error("Error fetching exercise details:", error);
//                 setError("No se pudo cargar la información del ejercicio.");
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchExerciseData();
//     }, [id, token]);

//     // ✅ Handle form submission
//     const handleSubmit = async (formData, setError, setSuccess) => {
//         if (!formData.name.trim()) {
//             setError("El nombre del ejercicio es obligatorio.");
//             return;
//         }

//         try {
//             await axios.put(
//                 `${backendUrl}/api/data/exercises/${id}/`,
//                 {
//                     ...formData,
//                     updated_by: userData.email, // ✅ Assign updated_by field
//                 },
//                 {
//                     headers: { Authorization: `Token ${token}` },
//                 }
//             );

//             setSuccess(true);
//             setTimeout(() => router.push("/ejercicios"), 2000);
//         } catch (error) {
//             setError(error.response?.data?.error || "Error al actualizar el ejercicio.");
//         }
//     };

//     return (
//         <MainPage>
//             <Head>
//                 <title>Beness App | Editar Ejercicio</title>
//             </Head>
//             {loading ? (
//                 <p>Cargando...</p>
//             ) : error ? (
//                 <p>{error}</p>
//             ) : (
//                 <ExerciseFormComponent
//                     actionName="Editar"
//                     entityName="Ejercicio"
//                     initialData={exerciseData}
//                     onSubmit={handleSubmit}
//                     onCancel={() => router.push("/ejercicios")}
//                     positions={dropdownData.positions}
//                     props={dropdownData.props}
//                     machines={dropdownData.machines}
//                     tags={dropdownData.tags}
//                 />
//             )}
//         </MainPage>
//     );
// };

// export default EditExercise;

import { useEffect, useState } from "react";
import MainPage from "@/pages/mainPage";
import { useRouter } from "next/router";
import axios from "axios";
import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import ExerciseFormComponent from "@/components/ExerciseFormComponent";
import Head from "next/head";

const EditExercise = () => {
  const router = useRouter();
  const { id } = router.query;
  const token = useFetchToken();
  const userData = useFetchUserInfo();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [exerciseData, setExerciseData] = useState(null);
  const [dropdownData, setDropdownData] = useState({ positions: [], props: [], machines: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const goBackToExercises = () => {
    router.push("/ejercicios");
  };

  // Fetch dropdowns once
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [positionsRes, propsRes, machinesRes, tagsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/data/all_positions/`, { headers: { Authorization: `Token ${token}` } }),
          axios.get(`${backendUrl}/api/data/all_props/`, { headers: { Authorization: `Token ${token}` } }),
          axios.get(`${backendUrl}/api/data/all_machines/`, { headers: { Authorization: `Token ${token}` } }),
          axios.get(`${backendUrl}/api/data/all_tags/`, { headers: { Authorization: `Token ${token}` } }),
        ]);

        setDropdownData({
          positions: positionsRes.data || [],
          props: propsRes.data || [],
          machines: machinesRes.data || [],
          tags: tagsRes.data || [],
        });
      } catch (e) {
        console.error("Error fetching dropdown data:", e);
        setError("Error cargando opciones.");
      }
    };
    if (token) fetchDropdownData();
  }, [token, backendUrl]);

  // Fetch exercise
  useEffect(() => {
    if (!id || !token) return;

    const fetchExerciseData = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${backendUrl}/api/data/exercises/${id}/`, {
          headers: { Authorization: `Token ${token}` },
        });

        // --- Normalize payload for the form ---
        const normalized = {
          // passthrough base
          ...data,

          // the form expects tags as array of IDs
          tags: Array.isArray(data.tags)
            ? data.tags.map((t) => (typeof t === "object" ? t.id : t)).filter(Boolean)
            : [],

          // keep compatibility: show GIF in the form "image" preview if present
          image: data.gif_url || data.image || "",

          // keep URLs and public_ids so they can round-trip on save
          video: data.video || "",
          video_public_id: data.video_public_id || "",
          gif_url: data.gif_url || "",
          gif_public_id: data.gif_public_id || "",

          // safe defaults for booleans/strings the form uses
          unilateral: typeof data.unilateral === "boolean" ? data.unilateral : false,
          position: data.position || "",
          prop: data.prop || "",
          machine: data.machine || "",
          group: data.group || "",
          box: data.box || "",
          head_position: data.head_position || "",
          instructions: data.instructions || "",
          description: data.description || "",
          name: data.name || "",
          active: typeof data.active === "boolean" ? data.active : true,
        };

        setExerciseData(normalized);
      } catch (e) {
        console.error("Error fetching exercise details:", e);
        setError("No se pudo cargar la información del ejercicio.");
      } finally {
        setLoading(false);
      }
    };

    fetchExerciseData();
  }, [id, token, backendUrl]);

  // Submit
  const handleSubmit = async (formData, setErr, setSuccess) => {
    if (!formData.name?.trim()) {
      setErr("El nombre del ejercicio es obligatorio.");
      return;
    }

    try {
      await axios.put(
        `${backendUrl}/api/data/exercises/${id}/`,
        {
          ...formData,
          updated_by: userData.email,
        },
        { headers: { Authorization: `Token ${token}` } }
      );

      setSuccess(true);
      setTimeout(goBackToExercises, 1200);
    } catch (e) {
      setErr(e.response?.data?.error || "Error al actualizar el ejercicio.");
    }
  };

  const handleSaveAndEnable = async (formData, setErr, setSuccess) => {
    await handleSubmit({ ...formData, active: true }, setErr, setSuccess);
  };

  return (
    <MainPage>
      <Head>
        <title>Beness App | Editar Ejercicio</title>
      </Head>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <ExerciseFormComponent
          actionName="Editar"
          entityName="Ejercicio"
          initialData={exerciseData}
          onSubmit={handleSubmit}
          secondarySubmitLabel={!exerciseData.active ? "Guardar y habilitar" : undefined}
          onSecondarySubmit={!exerciseData.active ? handleSaveAndEnable : undefined}
          onCancel={goBackToExercises}
          positions={dropdownData.positions}
          props={dropdownData.props}
          machines={dropdownData.machines}
          tags={dropdownData.tags}
        />
      )}
    </MainPage>
  );
};

export default EditExercise;
