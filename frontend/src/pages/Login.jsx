import { useState } from "react";
import { Eye, EyeOff, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  signIn,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
  signOut
} from "aws-amplify/auth";


function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
  minLength: false,
  hasLowercase: false,
  hasUppercase: false,
  hasNumber: false,
  hasSpecialChar: false,
  passwordsMatch: false,
});
const [isReset, setIsReset] = useState(false);
const [step, setStep] = useState("requestReset");
const [newPassword, setNewPassword] = useState("");


const checkPasswordRequirements = (password, confirmPwd = formData.confirmPassword) => {
  setPasswordRequirements({
    minLength: password.length >= 12,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    passwordsMatch: password === confirmPwd && password !== '',
  });
};


  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    console.log("calling HandleSUbmit function");
  e.preventDefault();
  setLoading(true);
  
  try {
    if (isSignUp) {
      // Validate passwords match
      console.log("validating password match");
      if (formData.password !== formData.confirmPassword) {
        console.log("passwords do not match");
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }
      
      // Call AWS Amplify signUp
      await signUp({
        username: formData.email,
        password: formData.password,
        attributes: {
          email: formData.email,
          given_name: formData.firstName,
          family_name: formData.lastName,
        },
      });
      console.log(signUp);
      
      toast.success("Sign up successful. Check your email to confirm.");
      setIsConfirming(true);
    } else {
      const user = await signIn({ username: formData.email, password: formData.password });
        if (user.isSignedIn) {
          const session = await fetchAuthSession();
          const token = session.tokens.idToken;
          const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}member/user`, {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_email: formData.email,
              username: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName
            })
          });
          const data = await response.json();
          window.location.reload();
        }
    }
  } catch (err) {
    toast.error(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};

  const handleConfirmSignUp = async (e) => {
    e.preventDefault();
    console.log("calling confirm sign up")
    setLoading(true);
    try {
      console.log(confirmationCode);
      await confirmSignUp({
        username: formData.email,
        confirmationCode,
      });
      toast.success("Account confirmed successfully.");
      setIsConfirming(false); // After confirmation, switch back to sign-in
      // Auto login after confirmation
      const user = await signIn({ username: formData.email, password: formData.password });
      if (user.isSignedIn) {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        // Fetch user data after auto-login
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}member/user`, {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
              user_email: formData.email,
              username: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName
            })
        });
        const data = await response.json();
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sign out

  const handleReset = async () => {
    try {
      const output = await resetPassword({ username: formData.email });
      const step = output.nextStep.resetPasswordStep;
      if (step === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        toast.success("Check your email for the confirmation code.");
        setStep("confirmReset");
      } else if (step === "DONE") {
        toast.success("Password reset already completed.");
        setIsReset(false);
        setStep("requestReset");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    try {
      await confirmResetPassword({ 
        username: formData.email,
        confirmationCode, 
        newPassword 
      });
      toast.success("Password reset successfully.");
      setIsReset(false);
      setStep("requestReset");
      handleInputChange("email", "");
      setConfirmationCode("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center p-4">
      <ToastContainer />
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Database className="h-5 w-5 text-gray-700" />
            </div>
            <h1 className="!text-xl font-semibold text-gray-900">
              Research Data Insights
            </h1>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isReset ? (
            step === "requestReset" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                    required
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleReset}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  Reset Password
                </Button>
                <button
                  type="button"
                  onClick={() => setIsReset(false)}
                  className="w-full text-center text-sm text-gray-500 hover:text-purple-600 transition-colors duration-200"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirmationCode" className="text-sm font-medium text-gray-700">
                    Confirmation Code
                  </Label>
                  <Input
                    id="confirmationCode"
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="!bg-transparent !border-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  Confirm Reset
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsReset(false);
                    setStep("requestReset");
                  }}
                  className="w-full text-center text-sm text-gray-500 hover:text-purple-600 transition-colors duration-200"
                >
                  Back to Login
                </button>
              </form>
            )
          ) : isConfirming ? (
            <form onSubmit={handleConfirmSignUp} className="space-y-4">
              <Label
                htmlFor="confirmationCode"
                className="text-sm font-medium text-gray-700"
              >
                Confirmation Code
              </Label>
              <Input
                id="confirmationCode"
                type="text"
                value={formData.confirmationCode}
                onChange={(e) =>
                  setConfirmationCode(e.target.value)
                }
                className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                required={isConfirming}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                Confirm
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-gray-700"
                    >
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                      required={isSignUp}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="!bg-transparent !border-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className="h-11 bg-gray-50/50 border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200 pr-10"
                      required={isSignUp}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="!bg-transparent !border-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsReset(true)}
                    className="!bg-transparent !border-none text-sm text-gray-500 hover:text-purple-600 transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                {isSignUp ? "Sign Up" : "Login"}
              </Button>

              
            </form>
          )}
          <div className="text-center">
            <span className="text-sm text-gray-500">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsConfirming(false);
                  setIsSignUp(!isSignUp);
                }}
                className="!bg-transparent !border-none text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200 hover:underline"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuthPage;
