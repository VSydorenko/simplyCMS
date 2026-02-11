"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, ChevronRight, Save } from "lucide-react";
import { supabase } from "../../supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/use-toast";
import { RecipientCard } from "./RecipientCard";
import { RecipientSelectorPopup } from "./RecipientSelectorPopup";
import { RecipientSaveDialog } from "./RecipientSaveDialog";

interface CheckoutRecipientFormProps {
  values: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

interface SavedRecipient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  city: string;
  address: string;
  notes: string | null;
  is_default: boolean;
}

const MAX_VISIBLE_CARDS = 3;

export function CheckoutRecipientForm({ values, onChange }: CheckoutRecipientFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasDifferentRecipient = values.hasDifferentRecipient;
  const selectedRecipientId = values.savedRecipientId;

  const [popupOpen, setPopupOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [originalRecipient, setOriginalRecipient] = useState<SavedRecipient | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedRecipients } = useQuery({
    queryKey: ["checkout-saved-recipients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_recipients")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedRecipient[];
    },
    enabled: !!user,
  });

  const visibleRecipients = useMemo(() => {
    if (!savedRecipients) return [];
    return savedRecipients.slice(0, MAX_VISIBLE_CARDS);
  }, [savedRecipients]);

  const showMoreButton = savedRecipients && savedRecipients.length > MAX_VISIBLE_CARDS;

  const currentValues = {
    firstName: values.recipientFirstName,
    lastName: values.recipientLastName,
    phone: values.recipientPhone,
    email: values.recipientEmail,
    city: values.recipientCity,
    address: values.recipientAddress,
    notes: values.recipientNotes,
  };

  useEffect(() => {
    if (!originalRecipient) { setHasChanges(false); return; }
    const changed =
      currentValues.firstName !== originalRecipient.first_name ||
      currentValues.lastName !== originalRecipient.last_name ||
      currentValues.phone !== originalRecipient.phone ||
      (currentValues.email || "") !== (originalRecipient.email || "") ||
      currentValues.city !== originalRecipient.city ||
      currentValues.address !== originalRecipient.address ||
      (currentValues.notes || "") !== (originalRecipient.notes || "");
    setHasChanges(changed);
  }, [currentValues, originalRecipient]);

  const handleSelectRecipient = (recipientId: string) => {
    if (selectedRecipientId === recipientId) {
      onChange("savedRecipientId", "");
      setOriginalRecipient(null);
      clearRecipientFields();
      return;
    }
    const recipient = savedRecipients?.find((r) => r.id === recipientId);
    if (recipient) {
      onChange("savedRecipientId", recipientId);
      setOriginalRecipient(recipient);
      fillRecipientFields(recipient);
    }
  };

  const fillRecipientFields = (recipient: SavedRecipient) => {
    onChange("recipientFirstName", recipient.first_name);
    onChange("recipientLastName", recipient.last_name);
    onChange("recipientPhone", recipient.phone);
    onChange("recipientEmail", recipient.email || "");
    onChange("recipientCity", recipient.city);
    onChange("recipientAddress", recipient.address);
    onChange("recipientNotes", recipient.notes || "");
  };

  const clearRecipientFields = () => {
    ["recipientFirstName", "recipientLastName", "recipientPhone", "recipientEmail", "recipientCity", "recipientAddress", "recipientNotes"].forEach(f => onChange(f, ""));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!originalRecipient) return;
      const { error } = await supabase
        .from("user_recipients")
        .update({
          first_name: currentValues.firstName,
          last_name: currentValues.lastName,
          phone: currentValues.phone,
          email: currentValues.email || null,
          city: currentValues.city,
          address: currentValues.address,
          notes: currentValues.notes || null,
        })
        .eq("id", originalRecipient.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-saved-recipients"] });
      toast({ title: "Отримувача оновлено" });
      setHasChanges(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("user_recipients")
        .insert({
          user_id: user.id,
          first_name: currentValues.firstName,
          last_name: currentValues.lastName,
          phone: currentValues.phone,
          email: currentValues.email || null,
          city: currentValues.city,
          address: currentValues.address,
          notes: currentValues.notes || null,
          is_default: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["checkout-saved-recipients"] });
      toast({ title: "Нового отримувача створено" });
      if (data) {
        onChange("savedRecipientId", data.id);
        setOriginalRecipient(data as SavedRecipient);
      }
      setHasChanges(false);
    },
  });

  const handleSaveClick = () => {
    if (originalRecipient) setSaveDialogOpen(true);
    else if (user) createMutation.mutate();
  };

  const handleCancelChanges = () => {
    if (originalRecipient) fillRecipientFields(originalRecipient);
    else clearRecipientFields();
    setHasChanges(false);
  };

  const handleAddNew = () => {
    onChange("savedRecipientId", "");
    setOriginalRecipient(null);
    clearRecipientFields();
    setPopupOpen(false);
  };

  useEffect(() => {
    if (!hasDifferentRecipient) {
      onChange("savedRecipientId", "");
      setOriginalRecipient(null);
      clearRecipientFields();
    }
  }, [hasDifferentRecipient]);

  return (
    <>
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Отримувач
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDifferentRecipient || false}
              onChange={(e) => onChange("hasDifferentRecipient", e.target.checked)}
              className="rounded mt-0.5"
            />
            <div>
              <span className="font-medium text-sm">Iнший отримувач</span>
              <p className="text-sm text-muted-foreground">Замовлення отримає iнша людина</p>
            </div>
          </label>

          {hasDifferentRecipient && (
            <div className="space-y-4 pt-4 border-t">
              {user && savedRecipients && savedRecipients.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Збереженi отримувачi</p>
                  <div className="grid grid-cols-3 gap-2">
                    {visibleRecipients.map((recipient) => (
                      <RecipientCard
                        key={recipient.id}
                        id={recipient.id}
                        firstName={recipient.first_name}
                        lastName={recipient.last_name}
                        phone={recipient.phone}
                        city={recipient.city}
                        isSelected={selectedRecipientId === recipient.id}
                        isDefault={recipient.is_default}
                        onClick={() => handleSelectRecipient(recipient.id)}
                      />
                    ))}
                  </div>
                  {showMoreButton && (
                    <button
                      type="button"
                      className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                      onClick={() => setPopupOpen(true)}
                    >
                      Показати всiх ({savedRecipients.length})
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Iм&apos;я отримувача *</label>
                  <input placeholder="Введiть iм'я" value={currentValues.firstName || ""} onChange={(e) => onChange("recipientFirstName", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Прiзвище отримувача *</label>
                  <input placeholder="Введiть прiзвище" value={currentValues.lastName || ""} onChange={(e) => onChange("recipientLastName", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Телефон отримувача *</label>
                  <input type="tel" placeholder="+380" value={currentValues.phone || ""} onChange={(e) => onChange("recipientPhone", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email отримувача</label>
                  <input type="email" placeholder="email@example.com" value={currentValues.email || ""} onChange={(e) => onChange("recipientEmail", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Мiсто *</label>
                  <input placeholder="Введiть мiсто" value={currentValues.city || ""} onChange={(e) => onChange("recipientCity", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Адреса *</label>
                  <input placeholder="вул. Хрещатик, 1, кв. 10" value={currentValues.address || ""} onChange={(e) => onChange("recipientAddress", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Примiтки</label>
                <textarea placeholder="Додаткова iнформацiя про отримувача..." value={currentValues.notes || ""} onChange={(e) => onChange("recipientNotes", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm resize-none" />
              </div>

              {user && hasChanges && (
                <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                  <button type="button" className="px-3 py-1.5 border rounded-md text-sm" onClick={handleCancelChanges}>Скасувати</button>
                  <button type="button" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm flex items-center gap-2" onClick={handleSaveClick} disabled={updateMutation.isPending || createMutation.isPending}>
                    <Save className="h-4 w-4" />
                    Зберегти змiни
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {savedRecipients && (
        <RecipientSelectorPopup
          open={popupOpen}
          onOpenChange={setPopupOpen}
          recipients={savedRecipients}
          selectedId={selectedRecipientId}
          onSelect={handleSelectRecipient}
          onAddNew={handleAddNew}
        />
      )}

      <RecipientSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        existingRecipientName={originalRecipient ? `${originalRecipient.first_name} ${originalRecipient.last_name}` : undefined}
        onUpdate={() => updateMutation.mutate()}
        onCreate={() => { onChange("savedRecipientId", ""); createMutation.mutate(); }}
        onCancel={handleCancelChanges}
      />
    </>
  );
}
