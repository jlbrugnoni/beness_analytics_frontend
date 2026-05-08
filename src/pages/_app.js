// import '@/styles/globals.css'

// export default function App({ Component, pageProps }) {



//   return <Component {...pageProps} />;
//   // return <Component {...pageProps} />
// }


import { StyledEngineProvider } from "@mui/material/styles";
import "@/styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <StyledEngineProvider injectFirst>
      <Component {...pageProps} />
    </StyledEngineProvider>
  );
}

export default MyApp;