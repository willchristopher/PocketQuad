"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Loader2, AlertTriangle, Info, AlertCircle } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  checkboxOption?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = 'info',
  checkboxOption,
  loading = false
}: ConfirmDialogProps) {
  
  const getIcon = () => {
      switch(variant) {
          case 'danger': return <AlertCircle className="h-6 w-6 text-red-500" />;
          case 'warning': return <AlertTriangle className="h-6 w-6 text-amber-500" />;
          case 'info': return <Info className="h-6 w-6 text-blue-500" />;
      }
  }

  const getButtonClass = () => {
      switch(variant) {
          case 'danger': return "bg-red-600 hover:bg-red-700";
          case 'warning': return "bg-amber-600 hover:bg-amber-700";
          default: return "";
      }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
              {getIcon()}
              <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {checkboxOption && (
            <div className="flex items-center space-x-2 py-2">
                <Checkbox 
                    id="confirm-checkbox" 
                    checked={checkboxOption.checked}
                    onCheckedChange={(checked) => checkboxOption.onChange(checked as boolean)}
                />
                <Label htmlFor="confirm-checkbox" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {checkboxOption.label}
                </Label>
            </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                onConfirm();
            }}
            disabled={loading}
            className={getButtonClass()}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
