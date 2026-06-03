import React, { createContext, useContext, useEffect, useState } from "react";
import subscriberApi from "@/lib/subscriberApi";

const SubscriberAuthCtx = createContext(null);

export function SubscriberAuthProvider({ children }) {
  const [subscriber, setSubscriber] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("subscriber_token");
    if (!token) {
      setSubscriber(false);
      setReady(true);
      return;
    }
    subscriberApi.get("/subscriber/me")
      .then((r) => setSubscriber(r.data))
      .catch(() => {
        localStorage.removeItem("subscriber_token");
        setSubscriber(false);
      })
      .finally(() => setReady(true));
  }, []);

  const login = async (username, password) => {
    const { data } = await subscriberApi.post("/subscriber/auth/login", { username, password });
    localStorage.setItem("subscriber_token", data.token);
    setSubscriber(data.subscriber);
    return data.subscriber;
  };

  const refreshMe = async () => {
    const { data } = await subscriberApi.get("/subscriber/me");
    setSubscriber(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("subscriber_token");
    setSubscriber(false);
  };

  return (
    <SubscriberAuthCtx.Provider value={{ subscriber, ready, login, refreshMe, logout }}>
      {children}
    </SubscriberAuthCtx.Provider>
  );
}

export function useSubscriberAuth() {
  return useContext(SubscriberAuthCtx);
}
