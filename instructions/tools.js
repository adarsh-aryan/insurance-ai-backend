export const TOOLS = [
  {
    type: "function",
    name: "save_claim_to_db",
    description:
      "Save the finalized insurance claim details to the database in structured JSON format.",
    parameters: {
      type: "object",
      properties: {
        claim_intent: { type: "string" },
        vehicle_details: { type: "object" },
        incident_details: { type: "object" },
        damage_assessment: { type: "object" },
        driver_and_third_party: { type: "object" },
        claim_summary: { type: "object" },
        status: { type: "string" },
        created_at: { type: "string" },
      },
      required: ["claim_intent", "vehicle_details", "incident_details"],
    },
  },
  {
    type: "function",
    name: "check_claim_status",
    description: "Check the status of claim from policy number",
    parameters: {
      type: "object",
      properties: {
        policy_number: { type: "string" },
      },
      required: ["policy_number"],
    },
  },
  {
    type: "function",
    name: "generate_policy_quote",
    description:
      "Generate estimated premium quotes for car or bike insurance based on user preferences and vehicle details.",
    parameters: {
      type: "object",
      properties: {
        vehicle_type: { type: "string", enum: ["car", "bike"] },
        manufacturer: { type: "string" },
        model: { type: "string" },
        year: { type: "string" },
        fuel_type: {
          type: "string",
          enum: ["petrol", "diesel", "electric", "cng"],
        },
        coverage_type: {
          type: "string",
          enum: ["comprehensive", "third_party", "own_damage_only"],
        },
        add_ons: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "zero_depreciation",
              "roadside_assistance",
              "engine_protect",
              "personal_accident_cover",
            ],
          },
        },
      },
      required: [
        "vehicle_type",
        "manufacturer",
        "model",
        "year",
        "coverage_type",
      ],
    },
  },

  {
    type: "function",
    name: "initiate_policy_payment",
    description:
      "Initiate payment for selected policy quote and return a secure payment link or QR code.",
    parameters: {
      type: "object",
      properties: {
        quote_id: {
          type: "string",
          description: "Unique identifier of the generated quote",
        },
        premium_amount: {
          type: "number",
          description: "Total premium amount to be paid",
        },
      },
      required: ["quote_id", "premium_amount"],
    },
  },
];