import React, { useState } from 'react';
import { Shield, UserCheck, UserX, UserRoundX, Clock3, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { UserStatus } from '@/types';

const statusLabel: Record<UserStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  disabled: 'Desactivado',
  rejected: 'Rechazado',
};

export function AdminUsersPage() {
  const { accounts, approveAccount, disableAccount, rejectAccount, restoreAccount, deleteAccount } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return a.username.localeCompare(b.username, 'es');
  });

  const pendingCount = accounts.filter((account) => account.status === 'pending').length;

  const handleAction = async (
    action: 'approve' | 'disable' | 'reject' | 'restore',
    accountId: string
  ) => {
    setBusyId(accountId);
    const result =
      action === 'approve' ? await approveAccount(accountId) :
      action === 'disable' ? await disableAccount(accountId) :
      action === 'reject' ? await rejectAccount(accountId) :
      await restoreAccount(accountId);

    if (!result.ok) {
      toast.error('No se pudo actualizar el usuario', { description: result.error });
      setBusyId(null);
      return;
    }

    const messages = {
      approve: 'Usuario aprobado',
      disable: 'Usuario desactivado',
      reject: 'Solicitud rechazada',
      restore: 'Usuario devuelto a pendiente',
    };
    toast.success(messages[action]);
    setBusyId(null);
  };

  const handleDelete = async (accountId: string, username: string) => {
    if (!confirm(`¿Eliminar el usuario ${username}?`)) {
      return;
    }
    setBusyId(accountId);
    const result = await deleteAccount(accountId);
    if (!result.ok) {
      toast.error('No se pudo eliminar el usuario', { description: result.error });
      setBusyId(null);
      return;
    }
    toast.success('Usuario eliminado');
    setBusyId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground">Aprobación local de acceso y gestión de estados.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-warning/40 text-warning">
            {pendingCount} pendientes
          </Badge>
          <Badge variant="outline">
            {accounts.length} total
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Gestión de accesos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="w-[340px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.username}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {account.role === 'admin' ? 'Admin' : 'Terapeuta'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          account.status === 'approved'
                            ? 'border-success/40 text-success'
                            : account.status === 'pending'
                              ? 'border-warning/40 text-warning'
                              : 'border-muted-foreground/30 text-muted-foreground'
                        }
                      >
                        {statusLabel[account.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(account.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('approve', account.id)}
                          disabled={account.status === 'approved' || busyId === account.id}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('disable', account.id)}
                          disabled={account.status === 'disabled' || busyId === account.id}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Desactivar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('reject', account.id)}
                          disabled={account.status === 'rejected' || busyId === account.id}
                        >
                          <UserRoundX className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction('restore', account.id)}
                          disabled={account.status === 'pending' || busyId === account.id}
                        >
                          <Clock3 className="w-4 h-4 mr-2" />
                          Pendiente
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDelete(account.id, account.username)}
                          disabled={busyId === account.id || account.username === 'leo'}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
