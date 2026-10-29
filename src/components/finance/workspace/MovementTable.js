import { Box, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tooltip } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PendingOutlinedIcon from "@mui/icons-material/PendingOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { formatMoney } from "@/utils/formatMoney";

export default function MovementTable({ data, kind, canEdit, sort, order, open, source, w, t }) {
    const debit = kind === "debit";
    const columns = ["date", "description", "amount", "business_description", ...(debit ? ["category", "subcategory"] : []), "studio", ...(!debit ? ["channel"] : []), debit ? "expense_period" : "operation_date", "status", "actions"];
    const description = (text) => <Tooltip title={text || ""}><Box sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{text || "—"}</Box></Tooltip>;
    return <TableContainer component={Paper} variant="outlined"><Table size="small" aria-label={w(kind)}><TableHead><TableRow>
        {columns.map((key) => <TableCell key={key} align={key === "amount" ? "right" : ["status", "actions"].includes(key) ? "center" : "left"} sx={{ whiteSpace: "nowrap" }}>{["date", "amount"].includes(key) ? <TableSortLabel active={order.replace("-", "") === key} direction={order.startsWith("-") ? "desc" : "asc"} onClick={() => sort(key)}>{w(key)}</TableSortLabel> : w(key)}</TableCell>)}
    </TableRow></TableHead><TableBody>{data.results.map((row) => {
        const reviewed = Boolean(row.classification?.reviewed && !row.needs_review);
        const editable = canEdit && !row.reconciled && !reviewed;
        const status = w(reviewed ? "reviewed" : "review");
        const action = w(editable ? "edit" : "open");
        return <TableRow hover key={row.id}>
            <TableCell sx={{ whiteSpace: "nowrap" }}>{row.source.bank_date || "—"}</TableCell>
            <TableCell sx={{ minWidth: 180, maxWidth: 320, overflowWrap: "anywhere" }}>{description(row.source.description)}</TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{formatMoney(row.source.amount)}</TableCell>
            <TableCell sx={{ minWidth: 160, maxWidth: 280, overflowWrap: "anywhere" }}>{description(row.classification?.description)}</TableCell>
            {debit && <><TableCell>{row.classification_labels?.category_name || "—"}</TableCell><TableCell>{row.classification_labels?.subcategory_name || "—"}</TableCell></>}
            <TableCell>{row.classification?.administration ? w("administration") : row.classification_labels?.studio_name || w("unknown")}</TableCell>
            {!debit && <TableCell>{t(`finance.receipts.channel.${row.classification?.channel || "unknown"}`)}</TableCell>}
            <TableCell sx={{ whiteSpace: "nowrap" }}>{debit ? row.classification?.expense_period?.slice(0, 7) || "—" : row.classification?.operation_date || "—"}</TableCell>
            <TableCell align="center"><Tooltip title={status}><Box component="span" role="img" aria-label={status} tabIndex={0} sx={{ display: "inline-flex", color: reviewed ? "success.main" : "warning.main", verticalAlign: "middle" }}>{reviewed ? <CheckCircleOutlineIcon fontSize="small" /> : <PendingOutlinedIcon fontSize="small" />}</Box></Tooltip></TableCell>
            <TableCell align="center" sx={{ whiteSpace: "nowrap" }}><Tooltip title={action}><IconButton size="small" aria-label={action} onClick={() => open(row)}>{editable ? <EditOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}</IconButton></Tooltip><Tooltip title={w("original")}><IconButton size="small" aria-label={w("original")} onClick={() => source(row)}><InfoOutlinedIcon fontSize="small" /></IconButton></Tooltip></TableCell>
        </TableRow>;
    })}{!data.count && <TableRow><TableCell colSpan={columns.length}>{w("empty")}</TableCell></TableRow>}</TableBody></Table></TableContainer>;
}
