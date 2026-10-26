import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "./ui/alert-dialog";

export const ConfirmAction = ({ trigger, title, description, confirmLabel = "Delete", onConfirm, testId }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent data-testid={`${testId}-dialog`} className="border-hc-line bg-hc-card">
      <AlertDialogHeader>
        <AlertDialogTitle className="hc-title text-2xl">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-hc-muted">{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid={`${testId}-cancel`} className="h-11 border-hc-line bg-hc-raised">Cancel</AlertDialogCancel>
        <AlertDialogAction data-testid={`${testId}-confirm`} onClick={onConfirm} className="h-11 bg-red-500 text-white hover:bg-red-600">
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
