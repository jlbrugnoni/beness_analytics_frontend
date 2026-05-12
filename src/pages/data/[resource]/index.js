import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

import MainPage from "@/pages/mainPage";
import useFetchToken from "@/components/useFetchUserId";
import { dataResources } from "@/constants/dataResources";
import styles from "@/styles/tablePage.module.css";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";


const emptyValueForField = (field) => {
    if (field.default !== undefined) return field.default;
    if (field.type === "boolean") return true;
    return "";
};


export default function ResourcePage() {
    const router = useRouter();
    const { resource } = router.query;
    const config = dataResources[resource];
    const token = useFetchToken();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const [rows, setRows] = useState([]);
    const [sites, setSites] = useState([]);
    const [studios, setStudios] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [staffMembers, setStaffMembers] = useState([]);
    const [pricingOptions, setPricingOptions] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [formData, setFormData] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [count, setCount] = useState(0);
    const rowsPerPage = 15;

    const initialFormData = useMemo(() => {
        if (!config) return {};
        return config.fields.reduce((acc, field) => {
            acc[field.name] = emptyValueForField(field);
            return acc;
        }, {});
    }, [config]);

    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Token ${token}` },
    }), [token]);

    const fetchRows = async (nextPage = page) => {
        if (!token || !config) return;
        setLoading(true);
        try {
            const response = await axios.get(
                `${backendUrl}/api/data/${config.endpoint}/?page=${nextPage + 1}`,
                authHeaders,
            );
            const responseRows = response.data.results || response.data;
            setRows(responseRows);
            setCount(response.data.count ?? responseRows.length);
            setPage(nextPage);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllPages = async (endpoint) => {
        let url = `${backendUrl}/api/data/${endpoint}/`;
        let allRows = [];
        while (url) {
            const response = await axios.get(url, authHeaders);
            const pageRows = response.data.results || response.data;
            allRows = [...allRows, ...pageRows];
            url = response.data.next || null;
        }
        return allRows;
    };

    const fetchLookups = async () => {
        if (!token) return;
        const [nextSites, nextStudios, nextRooms, nextStaffMembers, nextPricingOptions, nextServiceCategories] = await Promise.all([
            fetchAllPages("sites"),
            fetchAllPages("studios"),
            fetchAllPages("rooms"),
            fetchAllPages("staff-members"),
            fetchAllPages("pricing-options"),
            fetchAllPages("service-categories"),
        ]);
        setSites(nextSites);
        setStudios(nextStudios);
        setRooms(nextRooms);
        setStaffMembers(nextStaffMembers);
        setPricingOptions(nextPricingOptions);
        setServiceCategories(nextServiceCategories);
    };

    useEffect(() => {
        fetchRows(0).catch((err) => setError(err.response?.data?.detail || "Error loading data."));
    }, [token, config?.endpoint]);

    useEffect(() => {
        fetchLookups().catch(() => {});
    }, [token]);

    if (!config) {
        return (
            <MainPage>
                <div className={styles.container}>Resource not found.</div>
            </MainPage>
        );
    }

    const openCreateDialog = () => {
        setEditingRow(null);
        setFormData(initialFormData);
        setError("");
        setDialogOpen(true);
    };

    const openEditDialog = (row) => {
        setEditingRow(row);
        setFormData(config.fields.reduce((acc, field) => {
            acc[field.name] = row[field.name] ?? emptyValueForField(field);
            return acc;
        }, {}));
        setError("");
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const payload = { ...formData };
            config.fields.forEach((field) => {
                if (
                    ["site", "studio", "room", "staffMember", "pricingOption", "serviceCategory", "time"].includes(field.type)
                    && payload[field.name] === ""
                ) {
                    payload[field.name] = null;
                }
            });

            if (editingRow) {
                await axios.put(`${backendUrl}/api/data/${config.endpoint}/${editingRow.id}/`, payload, authHeaders);
            } else {
                await axios.post(`${backendUrl}/api/data/${config.endpoint}/`, payload, authHeaders);
            }
            setDialogOpen(false);
            await fetchRows(page);
        } catch (err) {
            setError(JSON.stringify(err.response?.data || "Error saving record."));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this record?")) return;
        await axios.delete(`${backendUrl}/api/data/${config.endpoint}/${id}/`, authHeaders);
        await fetchRows(page);
    };

    const renderField = (field) => {
        if (field.type === "boolean") {
            return (
                <FormControlLabel
                    key={field.name}
                    control={
                        <Checkbox
                            checked={Boolean(formData[field.name])}
                            onChange={(event) => setFormData({ ...formData, [field.name]: event.target.checked })}
                        />
                    }
                    label={field.label}
                />
            );
        }

        if (
            field.type === "select"
            || field.type === "site"
            || field.type === "studio"
            || field.type === "room"
            || field.type === "staffMember"
            || field.type === "pricingOption"
            || field.type === "serviceCategory"
        ) {
            let options = field.options || [];
            if (field.type === "site") {
                options = sites.map((site) => ({ value: site.id, label: site.name }));
            } else if (field.type === "studio") {
                options = studios.map((studio) => ({ value: studio.id, label: `${studio.site_name} - ${studio.name}` }));
            } else if (field.type === "room") {
                options = rooms.map((room) => ({ value: room.id, label: `${room.studio_name} - ${room.name}` }));
            } else if (field.type === "staffMember") {
                options = staffMembers.map((staff) => ({ value: staff.id, label: `${staff.site_name} - ${staff.name}` }));
            } else if (field.type === "pricingOption") {
                options = pricingOptions.map((option) => ({ value: option.id, label: `${option.site_name} - ${option.name}` }));
            } else if (field.type === "serviceCategory") {
                options = serviceCategories.map((category) => ({ value: category.id, label: `${category.site_name} - ${category.name}` }));
            }

            return (
                <TextField
                    key={field.name}
                    select
                    fullWidth
                    label={field.label}
                    value={formData[field.name] || ""}
                    required={field.required}
                    onChange={(event) => setFormData({ ...formData, [field.name]: event.target.value })}
                >
                    <MenuItem value="">None</MenuItem>
                    {options.map((option) => (
                        <MenuItem value={option.value} key={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        return (
            <TextField
                key={field.name}
                fullWidth
                label={field.label}
                type={field.type || "text"}
                required={field.required}
                multiline={field.multiline}
                rows={field.multiline ? 3 : 1}
                value={formData[field.name] || ""}
                onChange={(event) => setFormData({ ...formData, [field.name]: event.target.value })}
            />
        );
    };

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {config.label}</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>{config.label}</h1>
                    <Button className={styles.addButton} onClick={openCreateDialog}>
                        + Add
                    </Button>
                </div>
                {error && <Alert severity="error" style={{ width: "90%", marginBottom: "12px" }}>{error}</Alert>}
                <TableContainer component={Paper} className={styles.tableContainer}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {config.columns.map((column) => (
                                    <TableCell key={column.field}>{column.label}</TableCell>
                                ))}
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id}>
                                    {config.columns.map((column) => (
                                        <TableCell key={column.field}>
                                            {typeof row[column.field] === "boolean"
                                                ? row[column.field] ? "Yes" : "No"
                                                : row[column.field] || "N/A"}
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <EditIcon className={styles.buttonIcon} onClick={() => openEditDialog(row)} />
                                        <DeleteIcon className={styles.buttonIcon} onClick={() => handleDelete(row.id)} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!rows.length && (
                                <TableRow>
                                    <TableCell colSpan={config.columns.length + 1}>
                                        {loading ? "Loading..." : "No records found."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <div style={{ width: "90%", display: "flex", justifyContent: "flex-end" }}>
                    <TablePagination
                        component="div"
                        count={count}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[rowsPerPage]}
                        onPageChange={(_, nextPage) => fetchRows(nextPage)}
                    />
                </div>
            </div>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editingRow ? "Edit" : "Add"} {config.singular}</DialogTitle>
                <DialogContent style={{ display: "grid", gap: "16px", paddingTop: "12px" }}>
                    {config.fields.map(renderField)}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </MainPage>
    );
}
