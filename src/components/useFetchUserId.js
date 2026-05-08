import { useState, useEffect } from 'react';

export function useFetchToken() {

    if (typeof window !== "undefined") {
        var token = sessionStorage.getItem('token');
    }

    return token;
}

export default useFetchToken;

