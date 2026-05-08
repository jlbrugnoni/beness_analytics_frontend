// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import useFetchToken from "@/components/useFetchUserId";

// function useFetchUserInfo() {
//     // Define state variables
//     const [userInfo, setUserInfo] = useState({
//         username: null,
//         role: null,
//         user_id: null,
//         user_level: null,
//         permissions: [],
//         location: null,
//     });

//     const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
//     const token = useFetchToken();

//     useEffect(() => {
//         if (typeof window !== "undefined") {
//             // Load initial data from sessionStorage
//             const username = sessionStorage.getItem('username');
//             const role = sessionStorage.getItem('role');
//             const user_id = sessionStorage.getItem('user_id');
//             let user_level = null;

//             // Set user level based on role
//             switch (role) {
//                 case "Administrador":
//                     user_level = 5;
//                     break;
//                 case "Oficina":
//                     user_level = 4;
//                     break;
//                 case "Supervisor":
//                     user_level = 3;
//                     break;
//                 case "Operador":
//                     user_level = 2;
//                     break;
//                 case "Auxiliar":
//                     user_level = 1;
//                     break;
//                 default:
//                     user_level = null;
//             }

//             // Update state with session data
//             setUserInfo(prevState => ({
//                 ...prevState,
//                 username,
//                 role,
//                 user_id,
//                 user_level,
//             }));

//             // Fetch permissions from backend
//             async function fetchPermissions() {
//                 if (!token) return; // Ensure token is available

//                 try {
//                     const response = await axios.get(`${backendUrl}/api/data/get_user_permissions/`, {
//                         headers: {
//                             'Authorization': `Token ${token}`
//                         }
//                     });
//                     const { permissions } = response.data;

//                     // Update state with permissions data
//                     setUserInfo(prevState => ({
//                         ...prevState,
//                         permissions,
//                     }));
                    
//                 } catch (error) {
//                     console.error("Failed to fetch user permissions", error);
//                 }
//             }

//             const fetchIP = async () => {
//                 try {
//                     const response = await axios.get('https://ipinfo.io/json');
//                     const { location } = response.data;
//                     console.log("Location:");
//                     console.log(response.data);

//                     setUserInfo(prevState => ({
//                         ...prevState,
//                         location
//                     }));
//                 } catch (error) {
//                     console.error("Error fetching IP address:", error);
//                 }
//             };

//             fetchPermissions();
//             fetchIP();
//             // console.log(`User info: ${JSON.stringify(userInfo)}`);
//         }
//     }, [backendUrl, token]);

//     return userInfo;
// }

// export default useFetchUserInfo;

import { useState, useEffect } from 'react';
import { useRouter } from "next/router";
import axios from 'axios';
import useFetchToken from "@/components/useFetchUserId";

function useFetchUserInfo() {
    const router = useRouter();
    const [userInfo, setUserInfo] = useState({
        username: null,
        email: null,
        firstName: null,
        lastName: null,
        // permissions: [],
    });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    // const token = useFetchToken();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const username = sessionStorage.getItem('username');
            const email = sessionStorage.getItem('email');
            const firstName = sessionStorage.getItem('first_name');
            const lastName = sessionStorage.getItem('last_name');
            const is_staff = sessionStorage.getItem("is_staff") === "true";
            const id = sessionStorage.getItem("id") ? parseInt(sessionStorage.getItem("id"), 10) : null;

            setUserInfo(prevState => ({
                ...prevState,
                username,
                email,
                firstName,
                lastName,
                is_staff,
                id,
            }));

            // const fetchUserData = async () => {
            //     if (!token) return;

            //     try {
            //         const permissionsPromise = axios.get(`${backendUrl}/api/data/get_user_permissions/`, {
            //             headers: { 'Authorization': `Token ${token}` },
            //         });

            //         const ipPromise = axios.get('https://ipinfo.io/json');

            //         const [permissionsResponse, ipResponse] = await Promise.all([permissionsPromise, ipPromise]);

            //         const { permissions } = permissionsResponse.data;
            //         const location  = ipResponse.data;

            //         console.log("IP Response:", ipResponse.data);
            //         console.log("Location:", location);

            //         setUserInfo(prevState => ({
            //             ...prevState,
            //             permissions,
            //             location,
            //         }));

            //     } catch (error) {
            //         console.error("Error fetching user data:", error);
            //     }
            // };

            // fetchUserData();

        }
    }, [backendUrl, router]);

    // // Watch for location updates
    // useEffect(() => {
    //     if (userInfo.location) {
    //         console.log("Location updated:", userInfo.location);
    //     }
    // }, [userInfo.location]);

    return userInfo;
}

export default useFetchUserInfo;