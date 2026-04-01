
import * as msal from "@azure/msal-browser";

// Configuração para o Azure AD / Microsoft Entra ID
// Para produção, o usuário deve registrar um App no Portal Azure e substituir o clientId
const msalConfig = {
  auth: {
    clientId: "00000000-0000-0000-0000-000000000000", // Placeholder: Requer registro no Azure
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: ["User.Read", "Files.ReadWrite"],
};

let msalInstance: msal.PublicClientApplication | null = null;

export const getMsalInstance = async () => {
  if (!msalInstance) {
    msalInstance = new msal.PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }
  return msalInstance;
};

export const loginOneDrive = async () => {
  const instance = await getMsalInstance();
  try {
    const result = await instance.loginPopup(loginRequest);
    return result.account;
  } catch (error) {
    console.error("Login OneDrive falhou:", error);
    throw error;
  }
};

export const logoutOneDrive = async () => {
  const instance = await getMsalInstance();
  await instance.logoutPopup();
};

export const getAccessToken = async () => {
  const instance = await getMsalInstance();
  const accounts = instance.getAllAccounts();
  if (accounts.length === 0) return null;

  try {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return response.accessToken;
  } catch (error) {
    return null;
  }
};

export const saveToOneDrive = async (data: any) => {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/drive/special/approot:/gestao93_data.json:/content",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Erro ao salvar no OneDrive:", error);
    return false;
  }
};

export const loadFromOneDrive = async () => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/drive/special/approot:/gestao93_data.json",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (response.status === 404) return null;

    const fileMeta = await response.json();
    const downloadResponse = await fetch(fileMeta["@microsoft.graph.downloadUrl"]);
    return await downloadResponse.json();
  } catch (error) {
    console.error("Erro ao carregar do OneDrive:", error);
    return null;
  }
};
