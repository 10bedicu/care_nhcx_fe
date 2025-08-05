import { FC, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Claim } from "@/types/claim";
import { ScrollArea } from "@/components/ui/scroll-area";
import TaskCard from "./task-card";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";

interface ClaimNotificationSheetProps {
  claim: Claim;
}

const ClaimNotificationSheet: FC<ClaimNotificationSheetProps> = ({ claim }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", claim.id],
    queryFn: () => apis.claim.tasks(claim.id),
    enabled: isOpen, // Only fetch when sheet is open
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <BellIcon className="h-5 w-5" />
          <span className="sr-only">View notifications</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="pb-6 border-b border-gray-100">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BellIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 capitalize">
                {claim.use} #{claim.id.slice(0, 8)}
              </div>
              <div className="text-sm font-normal text-gray-500 mt-1">
                {tasks?.count ?? 0} total notification(s)
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 mt-6">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">
                  Loading notifications...
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Please wait while we fetch your tasks
                </p>
              </div>
            ) : !tasks?.results || tasks.results.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-3 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <BellIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-2">
                  No notifications found
                </p>
                <p className="text-sm text-gray-500">
                  There are no tasks or notifications for this claim
                </p>
              </div>
            ) : (
              tasks.results.map((task) => (
                <TaskCard key={task.identifier} task={task} />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ClaimNotificationSheet;
