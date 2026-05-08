import MainPage from "../mainPage";
import React from "react";
import styles from "@/styles/Home.module.css";
import { useRouter } from "next/router";
import { useState } from "react";
import { useEffect } from "react";
import { useContext } from "react";
import axios from "axios";

import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

import Image from "next/image";
import editIcon from "@/images/edit-icon.png";
import deleteIcon from "@/images/delete-icon.png";

import useFetchToken from "@/components/useFetchUserId";
import useFetchUserInfo from "@/components/useFetchUserInfo";
import { formatDateToDDMMYYYY } from "@/components/data";
import Head from "next/head";
import usePermissions, { hasPermission } from "@/hooks/usePermissions";

export function Home3() {

    const userData = useFetchUserInfo();
    return (


        <>
            <div className={styles.container}>
                <div>
                    <h1 className={styles.title}>Hola, {userData.firstName}</h1>
                </div>
            </div>
        </>

    )
}


export default function Home() {
    return (
        <MainPage>
            <Head>
                <title>Beness App | Home</title>
            </Head>
            <Home3 />
        </MainPage>
    );
}
