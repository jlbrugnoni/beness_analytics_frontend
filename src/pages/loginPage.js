import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import axios from "axios";

import styles from "../styles/LoginPage.module.css"; // Import the CSS Module
import benessLogo from "../images/beness-logo.png";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const loginForm = {
      email: username,
      password: password,
    };

    console.log("Login form data:", loginForm);

    // if (username === "admin" && password === "admin") {
    //   router.push("/mainPage");
    // }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      console.log(`${backendUrl}/api/data/login`)// This should be defined in your .env file
      const loginRequest = await axios.post(
        `${backendUrl}/api/data/login`,
        loginForm
      );

      if (loginRequest.data.message === "Login successful") {
        console.log("Login successful");
        // alert("Login Correcto");
        if (typeof window !== "undefined") {
          let token = loginRequest.data.token;
          let userUsername = loginRequest.data.username;
          let userEmail = loginRequest.data.email;
          let userFirstName = loginRequest.data.first_name;
          let userLastName = loginRequest.data.last_name;
          let is_staff = loginRequest.data.is_staff;
          let userId = loginRequest.data.id;
          let permissions = loginRequest.data.permissions;

          sessionStorage.setItem("token", token);
          sessionStorage.setItem("username", userUsername);
          sessionStorage.setItem("email", userEmail);
          sessionStorage.setItem("first_name", userFirstName);
          sessionStorage.setItem("last_name", userLastName);
          sessionStorage.setItem("is_staff", is_staff);
          sessionStorage.setItem("id", userId);
          sessionStorage.setItem("permissions", JSON.stringify(permissions));
          // sessionStorage.setItem("role", userGroups);
          // sessionStorage.setItem("user_id", userId);
          // console.log(token);
          // console.log(userId);
          // console.log(userUsername);
          // console.log(userGroups);
        }
        router.push(`/home`);
      } else if (loginRequest.data.message === "Contraseña incorrecta") {
        alert("Contraseña incorrecta");
        router.reload();
      } else if (loginRequest.data.message === "Usuario no existe") {
        alert("Usuario no existe");
        router.reload();
      } else {
        alert("Error al iniciar sesión");
        router.reload();
      }
    } catch (error) {
      console.error("Error occurred during login:", error);
      alert("Error al iniciar sesión");
      router.reload();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <Image src={benessLogo} alt="Company Logo" className={styles.logo} />
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="text"
            placeholder="Nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Login
          </button>
        </form>
        {/* <Link href="/forgot-password">
                    <a className={styles.forgotPassword}>Forgot password?</a>
                </Link> */}
      </div>
    </div>
  );
}
