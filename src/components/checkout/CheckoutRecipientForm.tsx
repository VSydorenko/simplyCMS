 import { useEffect } from "react";
 import { UseFormReturn } from "react-hook-form";
 import { useQuery } from "@tanstack/react-query";
 import {
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
 } from "@/components/ui/form";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { UserPlus, Users } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/hooks/useAuth";
 
 interface CheckoutRecipientFormProps {
   form: UseFormReturn<any>;
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
 }
 
 export function CheckoutRecipientForm({ form }: CheckoutRecipientFormProps) {
   const { user } = useAuth();
   const hasDifferentRecipient = form.watch("hasDifferentRecipient");
   const selectedRecipientId = form.watch("savedRecipientId");
 
   // Fetch saved recipients for logged-in users
   const { data: savedRecipients } = useQuery({
     queryKey: ["checkout-saved-recipients", user?.id],
     queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from("user_recipients")
         .select("*")
         .eq("user_id", user.id)
         .order("is_default", { ascending: false });
       if (error) throw error;
       return data as SavedRecipient[];
     },
     enabled: !!user,
   });
 
   // Auto-fill when selecting a saved recipient
   useEffect(() => {
     if (selectedRecipientId && selectedRecipientId !== "new" && savedRecipients) {
       const recipient = savedRecipients.find((r) => r.id === selectedRecipientId);
       if (recipient) {
         form.setValue("recipientFirstName", recipient.first_name);
         form.setValue("recipientLastName", recipient.last_name);
         form.setValue("recipientPhone", recipient.phone);
         form.setValue("recipientEmail", recipient.email || "");
         form.setValue("recipientCity", recipient.city);
         form.setValue("recipientAddress", recipient.address);
         form.setValue("recipientNotes", recipient.notes || "");
         form.setValue("saveRecipient", false); // Don't save already saved recipient
       }
     }
   }, [selectedRecipientId, savedRecipients, form]);
 
   // Clear recipient fields when unchecking "different recipient"
   useEffect(() => {
     if (!hasDifferentRecipient) {
       form.setValue("savedRecipientId", "");
       form.setValue("recipientFirstName", "");
       form.setValue("recipientLastName", "");
       form.setValue("recipientPhone", "");
       form.setValue("recipientEmail", "");
       form.setValue("recipientCity", "");
       form.setValue("recipientAddress", "");
       form.setValue("recipientNotes", "");
       form.setValue("saveRecipient", false);
     }
   }, [hasDifferentRecipient, form]);
 
   const isNewRecipient = !selectedRecipientId || selectedRecipientId === "new";
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="text-lg flex items-center gap-2">
           <UserPlus className="h-5 w-5" />
           Отримувач
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Checkbox for different recipient */}
         <FormField
           control={form.control}
           name="hasDifferentRecipient"
           render={({ field }) => (
             <FormItem className="flex flex-row items-start space-x-3 space-y-0">
               <FormControl>
                 <Checkbox
                   checked={field.value}
                   onCheckedChange={field.onChange}
                 />
               </FormControl>
               <div className="space-y-1 leading-none">
                 <FormLabel className="cursor-pointer">
                   Інший отримувач
                 </FormLabel>
                 <p className="text-sm text-muted-foreground">
                   Замовлення отримає інша людина
                 </p>
               </div>
             </FormItem>
           )}
         />
 
         {/* Recipient form fields - shown only when hasDifferentRecipient is true */}
         {hasDifferentRecipient && (
           <div className="space-y-4 pt-4 border-t">
             {/* Saved recipients selector - only for logged-in users with saved recipients */}
             {user && savedRecipients && savedRecipients.length > 0 && (
               <FormField
                 control={form.control}
                 name="savedRecipientId"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel className="flex items-center gap-2">
                       <Users className="h-4 w-4" />
                       Збережені отримувачі
                     </FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Оберіть отримувача або введіть нового" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         <SelectItem value="new">
                           + Новий отримувач
                         </SelectItem>
                         {savedRecipients.map((recipient) => (
                           <SelectItem key={recipient.id} value={recipient.id}>
                             {recipient.first_name} {recipient.last_name} ({recipient.city})
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             )}
 
             {/* Recipient details form */}
             <div className="grid sm:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="recipientFirstName"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Ім'я отримувача *</FormLabel>
                     <FormControl>
                       <Input placeholder="Введіть ім'я" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="recipientLastName"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Прізвище отримувача *</FormLabel>
                     <FormControl>
                       <Input placeholder="Введіть прізвище" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             <div className="grid sm:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="recipientPhone"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Телефон отримувача *</FormLabel>
                     <FormControl>
                       <Input type="tel" placeholder="+380" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="recipientEmail"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Email отримувача</FormLabel>
                     <FormControl>
                       <Input type="email" placeholder="email@example.com" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             <div className="grid sm:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="recipientCity"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Місто *</FormLabel>
                     <FormControl>
                       <Input placeholder="Введіть місто" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="recipientAddress"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Адреса *</FormLabel>
                     <FormControl>
                       <Input placeholder="вул. Хрещатик, 1, кв. 10" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>
 
             <FormField
               control={form.control}
               name="recipientNotes"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Примітки</FormLabel>
                   <FormControl>
                     <Textarea
                       placeholder="Додаткова інформація про отримувача..."
                       className="resize-none"
                       {...field}
                     />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             {/* Save recipient checkbox - only for logged-in users and new recipients */}
             {user && isNewRecipient && (
               <FormField
                 control={form.control}
                 name="saveRecipient"
                 render={({ field }) => (
                   <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                     <FormControl>
                       <Checkbox
                         checked={field.value}
                         onCheckedChange={field.onChange}
                       />
                     </FormControl>
                     <div className="space-y-1 leading-none">
                       <FormLabel className="cursor-pointer">
                         Запам'ятати отримувача
                       </FormLabel>
                       <p className="text-sm text-muted-foreground">
                         Збереже контакт для наступних замовлень
                       </p>
                     </div>
                   </FormItem>
                 )}
               />
             )}
           </div>
         )}
       </CardContent>
     </Card>
   );
 }