import Head from "next/head";
import { useRouter } from "next/router";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import GroupIcon from "@mui/icons-material/Group";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import MainPage from "@/pages/mainPage";
import useAccess from "@/hooks/useAccess";
import useI18n from "@/hooks/useI18n";
import styles from "@/styles/tablePage.module.css";

import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";


// ─── Section definitions (keys resolved at render time via t()) ───────────────

const MONTHLY_SECTIONS = [
    {
        href: "/dashboard/monthly",
        icon: CalendarMonthIcon,
        titleKey: "dashboard.hub.monthly.title",
        descriptionKey: "dashboard.hub.monthly.description",
        badgeKey: "dashboard.hub.badge.monthly",
        badgeColor: "primary",
    },
    {
        href: "/dashboard/revenue",
        icon: TrendingUpIcon,
        titleKey: "dashboard.hub.revenue.title",
        descriptionKey: "dashboard.hub.revenue.description",
        badgeKey: "dashboard.hub.badge.monthly",
        badgeColor: "primary",
        requiresMoney: true,
    },
    {
        href: "/dashboard/retention",
        icon: GroupIcon,
        titleKey: "dashboard.hub.retention.title",
        descriptionKey: "dashboard.hub.retention.description",
        badgeKey: "dashboard.hub.badge.monthly",
        badgeColor: "primary",
    },
    {
        href: "/dashboard/top-clients",
        icon: LeaderboardIcon,
        titleKey: "dashboard.hub.topClients.title",
        descriptionKey: "dashboard.hub.topClients.description",
        badgeKey: "dashboard.hub.badge.monthly",
        badgeColor: "primary",
    },
];

const WEEKLY_SECTIONS = [
    {
        href: "/dashboard/weekly",
        icon: CalendarViewWeekIcon,
        titleKey: "dashboard.hub.weekly.title",
        descriptionKey: "dashboard.hub.weekly.description",
        badgeKey: "dashboard.hub.badge.weekly",
        badgeColor: "success",
    },
    {
        href: "/dashboard/attendance",
        icon: EventAvailableIcon,
        titleKey: "dashboard.hub.attendance.title",
        descriptionKey: "dashboard.hub.attendance.description",
        badgeKey: "dashboard.hub.badge.weekly",
        badgeColor: "success",
    },
    {
        href: "/dashboard/occupancy",
        icon: MeetingRoomIcon,
        titleKey: "dashboard.hub.occupancy.title",
        descriptionKey: "dashboard.hub.occupancy.description",
        badgeKey: "dashboard.hub.badge.weekly",
        badgeColor: "success",
    },
];

const SHARED_SECTIONS = [
    {
        href: "/dashboard/conversion",
        icon: AutoGraphIcon,
        titleKey: "dashboard.hub.conversion.title",
        descriptionKey: "dashboard.hub.conversion.description",
        badgeKey: "dashboard.hub.badge.both",
        badgeColor: "default",
    },
];


// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({ card, router, t }) {
    const Icon = card.icon;

    return (
        <Paper
            elevation={1}
            sx={{
                cursor: "pointer",
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 4 },
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
            onClick={() => router.push(card.href)}
        >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "var(--beness-azul, #8ab8d7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <Icon style={{ color: "#fff", fontSize: 22 }} />
                </div>
                <Chip
                    label={t(card.badgeKey)}
                    size="small"
                    color={card.badgeColor}
                    variant="outlined"
                />
            </Stack>
            <div>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {t(card.titleKey)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t(card.descriptionKey)}
                </Typography>
            </div>
            <Stack direction="row" alignItems="center" spacing={0.5} style={{ marginTop: "auto" }}>
                <Typography variant="body2" color="primary" fontWeight={600}>
                    {t("dashboard.hub.open")}
                </Typography>
                <ArrowForwardIcon style={{ fontSize: 16 }} color="primary" />
            </Stack>
        </Paper>
    );
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardIndexPage() {
    const router = useRouter();
    const access = useAccess();
    const { t } = useI18n();
    const canViewMoney = Boolean(access.capabilities?.can_view_money);

    const visibleMonthly = MONTHLY_SECTIONS.filter((card) => !card.requiresMoney || canViewMoney);

    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | {t("dashboard.title")}</title>
            </Head>
            <div className={styles.container}>
                <div style={{ width: "100%", display: "grid", gap: "32px" }}>

                    {/* Header */}
                    <div>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            {t("dashboard.hub.title")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t("dashboard.hub.subtitle")}
                        </Typography>
                    </div>

                    {/* Monthly Reports */}
                    <div style={{ display: "grid", gap: "16px" }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                                {t("dashboard.hub.monthlyReports")}
                            </Typography>
                            <Divider style={{ flex: 1 }} />
                        </Stack>
                        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                            {visibleMonthly.map((card) => (
                                <SectionCard key={card.href} card={card} router={router} t={t} />
                            ))}
                        </div>
                    </div>

                    {/* Weekly Reports */}
                    <div style={{ display: "grid", gap: "16px" }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                                {t("dashboard.hub.weeklyReports")}
                            </Typography>
                            <Divider style={{ flex: 1 }} />
                        </Stack>
                        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                            {WEEKLY_SECTIONS.map((card) => (
                                <SectionCard key={card.href} card={card} router={router} t={t} />
                            ))}
                        </div>
                    </div>

                    {/* Cross-Period */}
                    <div style={{ display: "grid", gap: "16px" }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                                {t("dashboard.hub.crossPeriod")}
                            </Typography>
                            <Divider style={{ flex: 1 }} />
                        </Stack>
                        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                            {SHARED_SECTIONS.map((card) => (
                                <SectionCard key={card.href} card={card} router={router} t={t} />
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </MainPage>
    );
}
