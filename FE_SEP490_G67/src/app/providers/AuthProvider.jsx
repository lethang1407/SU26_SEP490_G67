import { createContext, useState } from 'react'

export const AuthStateContext = createContext(null)
export const AuthActionsContext = createContext(null)

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [accessToken, setAccessToken] = useState(null)

    const login = (authResponse) => {
        const extractInfor = {
            email: authResponse.email,
            fullName: authResponse.fullName,
            roles: authResponse.roles,
        }
        setUser(extractInfor)
        setAccessToken(authResponse.accessToken)
        localStorage.setItem('user', JSON.stringify(extractInfor))
        localStorage.setItem('accessToken', authResponse.accessToken)
    }

    const logout = () => {
        setUser(null)
        setAccessToken(null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        window.location.href = '/'
    }

    const stateValues = { user, accessToken }
    const actionValues = { login, logout }

    return (
        <AuthStateContext.Provider value={stateValues}>
            <AuthActionsContext.Provider value={actionValues}>
                {children}
            </AuthActionsContext.Provider>
        </AuthStateContext.Provider>
    )
}

export default AuthProvider