import { Product } from "../../../common/types/chat";
import React from "react";
interface FPProductMessageViewProps {
  products: Product[];
  formatCurrency: (amount: number) => string;
}

export default function FPProductMessageView({
  products,
  formatCurrency,
}: FPProductMessageViewProps): React.JSX.Element | null {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        maxWidth: "100%",
      }}
    >
      {/* Horizontal scrollable product cards */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          paddingBottom: "4px",
        }}
      >
        {products.map((p, index) => {
          const productName = p.title || "Product";
          const productImage =
            (p as Product & { image?: string; imageUrl?: string }).image ||
            (p as Product & { image?: string; imageUrl?: string }).image_url;
          const currentPrice = p.selling_amount || p.actual_amount || 0;
          const originalPrice =
            p.actual_amount &&
            p.selling_amount &&
            p.actual_amount !== p.selling_amount
              ? p.actual_amount
              : null;

          return (
            <div
              key={p.action_id || `${p.title}-${index}`}
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "12px",
                background: "#FFFFFF",
                borderRadius: "8px",
                padding: "12px",
                boxShadow: "0px 1px 3px 0px rgba(0, 0, 0, 0.1)",
                cursor: "pointer",
                width: "280px",
                minWidth: "280px",
                flexShrink: 0,
              }}
              onClick={() => {
                // Handle product click - redirect to product URL
                if (p.rediection_url) {
                  window.open(
                    p.rediection_url,
                    "_blank",
                    "noopener,noreferrer"
                  );
                } else {
                  console.log("Product clicked (no URL):", p);
                }
              }}
            >
              {/* Product Image - Left Side */}
              <div
                style={{
                  width: "112px",
                  height: "112px",
                  minWidth: "80px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#9CA3AF",
                      fontSize: "12px",
                    }}
                  >
                    No Image
                  </div>
                )}
              </div>

              {/* Product Info - Right Side */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minWidth: 0,
                  gap: "4px",
                  position: "relative",
                  textAlign: "left",
                }}
              >
                {/* Title */}
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    lineHeight: "1.2em",
                    color: "#0A1F34",
                    marginBottom: "4px",
                  }}
                >
                  {productName}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 400,
                    lineHeight: "1.4em",
                    color: "#6C7985",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginBottom: "8px",
                    flex: 1,
                  }}
                >
                  {p.description || ""}
                </div>

                {/* Bottom Row: Price on Left, Arrow on Right */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                  }}
                >
                  {/* Price Section - Left */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        lineHeight: "1em",
                        color: "#0A1F34",
                      }}
                    >
                      {formatCurrency(currentPrice)}
                    </div>
                    {originalPrice && (
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          lineHeight: "1em",
                          color: "#6C7985",
                          textDecoration: "line-through",
                        }}
                      >
                        {formatCurrency(originalPrice)}
                      </div>
                    )}
                  </div>

                  {/* Redirect Arrow Button - Right */}
                  <button
                    style={{
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle redirect - navigate to product URL
                      if (p.rediection_url) {
                        window.open(
                          p.rediection_url,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      } else {
                        console.log("Redirect clicked (no URL):", p);
                      }
                    }}
                    aria-label="View product details"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 4L10 8L6 12"
                        stroke="#232534"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
