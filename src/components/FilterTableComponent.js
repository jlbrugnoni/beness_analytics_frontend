// import { useState, useEffect } from "react";
// import axios from "axios";
// import { useRouter } from "next/router";
// import { MenuItem, FormControl, InputLabel, Grid, Select, Checkbox, ListItemText, IconButton } from "@mui/material";
// import { Clear as ClearIcon } from "@mui/icons-material";
// import TableComponent from "@/components/TableComponent";
// import useFetchToken from "@/components/useFetchUserId";
// import styles from "@/styles/FilterTablePage.module.css";

// const fieldLabels = {
//     position__name__in: "Posición",
//     prop__name__in: "Implemento",
//     machine__name__in: "Máquina",
//     group__in: "Grupo"
// };

// const booleanFilters = {
//     box: "Caja",
//     unilateral: "Unilateral"
// };

// export default function FilterTableComponent() {
//     const router = useRouter();
//     const token = useFetchToken();
//     const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

//     const [filters, setFilters] = useState({
//         position__name__in: [],
//         prop__name__in: [],
//         machine__name__in: [],
//         group__in: [],
//         box: "",
//         unilateral: ""
//     });

//     const [exercises, setExercises] = useState([]);
//     const [options, setOptions] = useState({ positions: [], props: [], machines: [], group__in: ["Piernas", "Tronco", "Brazos"] });

//     useEffect(() => {
//         fetchExercises();
//     }, [filters]);

//     useEffect(() => {
//         fetchFilterOptions();
//     }, []);

//     const fetchExercises = async () => {
//         try {
//             const formattedFilters = {
//                 ...filters,
//                 position__name__in: filters.position__name__in.length ? filters.position__name__in.join(",") : undefined,
//                 prop__name__in: filters.prop__name__in.length ? filters.prop__name__in.join(",") : undefined,
//                 machine__name__in: filters.machine__name__in.length ? filters.machine__name__in.join(",") : undefined,
//                 group__in: filters.group__in.length ? filters.group__in.join(",") : undefined
//             };

//             const response = await axios.get(`${backendUrl}/api/data/exercises/`, {
//                 headers: { Authorization: `Token ${token}` },
//                 params: formattedFilters
//             });
//             setExercises(response.data.results || []);
//         } catch (error) {
//             console.error("Error fetching exercises:", error);
//             setExercises([]);
//         }
//     };

//     const fetchFilterOptions = async () => {
//         try {
//             const [positionsRes, propsRes, machinesRes] = await Promise.all([
//                 axios.get(`${backendUrl}/api/data/all_positions/`, { headers: { Authorization: `Token ${token}` } }),
//                 axios.get(`${backendUrl}/api/data/all_props/`, { headers: { Authorization: `Token ${token}` } }),
//                 axios.get(`${backendUrl}/api/data/all_machines/`, { headers: { Authorization: `Token ${token}` } })
//             ]);
//             setOptions({
//                 positions: positionsRes.data || [],
//                 props: propsRes.data || [],
//                 machines: machinesRes.data || [],
//                 group__in: ["Piernas", "Tronco", "Brazos"]
//             });
//         } catch (error) {
//             console.error("Error fetching filter options:", error);
//         }
//     };

//     const handleMultiSelectChange = (event) => {
//         const { name, value } = event.target;
//         setFilters({ ...filters, [name]: value.length ? value : [] });
//     };

//     const clearFilter = (field) => {
//         setFilters({ ...filters, [field]: [] });
//     };

//     return (
//         <div className={styles.container}>
//             <Grid container spacing={2} className={styles.filterContainer}>
//                 {Object.keys(fieldLabels).map((field) => (
//                     <Grid item xs={12} sm={6} md={3} key={field} className={styles.filterItem}>
//                         <FormControl fullWidth>
//                             <InputLabel>{fieldLabels[field]}</InputLabel>
//                             <Select  multiple name={field} value={filters[field]} onChange={handleMultiSelectChange} renderValue={(selected) => selected.join(", ")}
//                                 endAdornment={filters[field].length > 0 && (
//                                     <IconButton size="small" onClick={() => clearFilter(field)} className={styles.clearButton}>
//                                         <ClearIcon fontSize="small" />
//                                     </IconButton>
//                                 )}>
//                                 {(options[field.replace("__name__in", "s")] || []).map((item) => (
//                                     <MenuItem key={item.id || item} value={item.name || item}>
//                                         <Checkbox checked={filters[field].indexOf(item.name || item) > -1} />
//                                         <ListItemText primary={item.name || item} />
//                                     </MenuItem>
//                                 ))}
//                             </Select>
//                         </FormControl>
//                     </Grid>
//                 ))}
//                 {Object.keys(booleanFilters).map((field) => (
//                     <Grid item xs={12} sm={6} md={3} key={field} className={styles.filterItem}>
//                         <FormControl fullWidth>
//                             <InputLabel>{booleanFilters[field]}</InputLabel>
//                             <Select name={field} value={filters[field]} onChange={(e) => setFilters({ ...filters, [field]: e.target.value })}>
//                                 <MenuItem value="">Todas</MenuItem>
//                                 <MenuItem value="true">Sí</MenuItem>
//                                 <MenuItem value="false">No</MenuItem>
//                             </Select>
//                         </FormControl>
//                     </Grid>
//                 ))}
//             </Grid>
//             <TableComponent
//                 data={exercises || []}
//                 entityName="Ejercicios"
//                 columns={[
//                     { label: "Nombre", field: "name" },
//                     { label: "Posición", field: "position" },
//                     { label: "Implemento", field: "prop" },
//                     { label: "Máquina", field: "machine" },
//                     { label: "Grupo", field: "group" },
//                     { label: "Caja", field: "box", type: "boolean" },
//                     { label: "Unilateral", field: "unilateral", type: "boolean" },
//                     { label: "Creado Por", field: "created_by" }
//                 ]}
//                 onAdd={() => router.push("ejercicios/add")}
//                 onEdit={(id) => router.push(`ejercicios/edit?id=${id}`)}
//             />
//         </div>
//     );
// }

// Version 2


import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { MenuItem, FormControl, InputLabel, Grid, Select, Checkbox, ListItemText, IconButton } from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import TableComponent from "@/components/TableComponent";
import useFetchToken from "@/components/useFetchUserId";
import styles from "@/styles/FilterTablePage.module.css";

const fieldLabels = {
    position__name__in: "Posición",
    prop__name__in: "Implemento",
    machine__name__in: "Máquina",
    group__in: "Grupo"
};

const booleanFilters = {
    box: "Caja",
    unilateral: "Unilateral"
};

export default function FilterTableComponent() {
    const router = useRouter();
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [filters, setFilters] = useState({
        position__name__in: [],
        prop__name__in: [],
        machine__name__in: [],
        group__in: [],
        box: "",
        unilateral: ""
    });

    const [exercises, setExercises] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [options, setOptions] = useState({ positions: [], props: [], machines: [], group__in: ["Piernas", "Tronco", "Brazos"] });

    useEffect(() => {
        setPage(0); // Reset to the first page when filters change
        fetchExercises();
    }, [filters, page, rowsPerPage]);

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    const fetchExercises = async () => {
        try {
            const formattedFilters = {
                ...filters,
                position__name__in: filters.position__name__in.length ? filters.position__name__in.join(",") : undefined,
                prop__name__in: filters.prop__name__in.length ? filters.prop__name__in.join(",") : undefined,
                machine__name__in: filters.machine__name__in.length ? filters.machine__name__in.join(",") : undefined,
                group__in: filters.group__in.length ? filters.group__in.join(",") : undefined,
                page: page + 1,
                page_size: rowsPerPage
            };

            const response = await axios.get(`${backendUrl}/api/data/exercises/`, {
                headers: { Authorization: `Token ${token}` },
                params: formattedFilters
            });
            setExercises(response.data.results || []);
            setTotalCount(response.data.count || 0);
        } catch (error) {
            console.error("Error fetching exercises:", error);
            setExercises([]);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const [positionsRes, propsRes, machinesRes] = await Promise.all([
                axios.get(`${backendUrl}/api/data/all_positions/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_props/`, { headers: { Authorization: `Token ${token}` } }),
                axios.get(`${backendUrl}/api/data/all_machines/`, { headers: { Authorization: `Token ${token}` } })
            ]);
            setOptions({
                positions: positionsRes.data || [],
                props: propsRes.data || [],
                machines: machinesRes.data || [],
                group__in: ["Piernas", "Tronco", "Brazos"]
            });
        } catch (error) {
            console.error("Error fetching filter options:", error);
        }
    };

    const handleMultiSelectChange = (event) => {
        const { name, value } = event.target;
        setFilters({ ...filters, [name]: value.length ? value : [] });
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const clearFilter = (field) => {
        setFilters({ ...filters, [field]: [] });
    };

    return (
        <div className={styles.container}>
            <Grid container spacing={2} className={styles.filterContainer}>
                {Object.keys(fieldLabels).map((field) => (
                    <Grid item xs={12} sm={6} md={3} key={field} className={styles.filterItem}>
                        <FormControl fullWidth>
                            <InputLabel>{fieldLabels[field]}</InputLabel>
                            <Select multiple name={field} value={filters[field]} onChange={handleMultiSelectChange} renderValue={(selected) => selected.join(", ")}
                                endAdornment={filters[field].length > 0 && (
                                    <IconButton size="small" onClick={() => clearFilter(field)} className={styles.clearButton}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                )}>
                                {(options[field.replace("__name__in", "s")] || []).map((item) => (
                                    <MenuItem key={item.id || item} value={item.name || item}>
                                        <Checkbox checked={filters[field].indexOf(item.name || item) > -1} />
                                        <ListItemText primary={item.name || item} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                ))}
            </Grid>
            <TableComponent
                data={exercises || []}
                entityName="Ejercicios"
                columns={[
                    { label: "Nombre", field: "name" },
                    { label: "Posición", field: "position" },
                    { label: "Implemento", field: "prop" },
                    { label: "Máquina", field: "machine" },
                    { label: "Grupo", field: "group" },
                    { label: "Caja", field: "box", type: "boolean" },
                    { label: "Unilateral", field: "unilateral", type: "boolean" },
                    { label: "Creado Por", field: "created_by" }
                ]}
                totalCount={totalCount}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                onAdd={() => router.push("ejercicios/add")}
                onEdit={(id) => router.push(`ejercicios/edit?id=${id}`)}
            />
        </div>
    );
}
