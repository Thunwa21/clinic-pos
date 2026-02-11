"use client";

import { useState, FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import type { Patient } from "@/lib/types";

interface PatientFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function PatientFormModal({
  open,
  onClose,
  onCreated,
}: PatientFormModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhoneNumber("");
    setError("");
    setSubmitting(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await apiFetch<Patient>("/patients", {
        method: "POST",
        body: { firstName, lastName, phoneNumber },
      });
      resetForm();
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("A patient with this phone number already exists.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to create patient"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add New Patient">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="First Name"
            type="text"
            required
            maxLength={200}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter first name"
          />
          <Input
            label="Last Name"
            type="text"
            required
            maxLength={200}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter last name"
          />
          <Input
            label="Phone Number"
            type="tel"
            required
            maxLength={50}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 081-234-5678"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-danger-light px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Patient"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
