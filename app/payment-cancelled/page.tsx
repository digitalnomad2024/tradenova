"use client";

export default function PaymentCancelled() {
  const goBack = () => {
    window.history.back();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "white",
          padding: "35px 25px",
          borderRadius: "16px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "50px", marginBottom: "15px" }}>
          ⚠️
        </div>

        <h1
          style={{
            fontSize: "28px",
            marginBottom: "12px",
          }}
        >
          Payment Cancelled
        </h1>

        <p
          style={{
            color: "#666",
            fontSize: "16px",
            lineHeight: "1.5",
            marginBottom: "25px",
          }}
        >
          Your payment was cancelled or could not be completed.
          Your challenge has not been activated.
        </p>

        <button
          type="button"
          onClick={goBack}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "8px",
            background: "#111",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back to Challenge
        </button>
      </div>
    </div>
  );
}