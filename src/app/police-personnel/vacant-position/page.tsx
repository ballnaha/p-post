'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Autocomplete,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Fade,
  Card,
  CardContent,
  CardActions,
  Divider,
  alpha,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Skeleton,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Badge,
  Collapse,
  IconButton as MuiIconButton,
} from '@mui/material';
import {
  AssignmentTurnedIn as VacantIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  DragIndicator as DragIndicatorIcon,
  ViewComfy as ViewComfyIcon,
  ViewCompact as ViewCompactIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  InfoOutlined as InfoOutlinedIcon,
  Business as UnitIcon,
  School as EducationIcon,
  Work as ServiceIcon,
  AssignmentInd as PositionIcon,
  LinkOff as UnlinkIcon,
  ManageAccounts as ManageAccountsIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
import DataTablePagination from '@/components/DataTablePagination';
import { EmptyState } from '@/app/components/EmptyState';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

interface VacantPositionData {
  id: string;
  year: number;
  notes?: string;
  displayOrder?: number; // ลำดับการแสดงผล
  nominator?: string; // ผู้สนับสนุน
  requestedPosition?: string; // ตำแหน่งที่ขอ (deprecated - ใช้ requestedPosCode แทน)
  requestedPositionId?: number; // รหัสตำแหน่งที่ขอ (FK)
  requestedPosCode?: {
    id: number;
    name: string;
  };
  isAssigned?: boolean; // สถานะจับคู่แล้ว
  assignmentInfo?: {
    assignedPosition: string;
    assignedUnit: string;
    assignedDate: string;
    assignedYear: number;
  } | null;
  originalPersonnelId?: string;
  noId?: number;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: string;
  education?: string;
  seniority?: string;
  actingAs?: string;
  birthDate?: string;
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  trainingLocation?: string;
  trainingCourse?: string;
  createdAt: string;
  posCodeMaster?: {
    id: number;
    name: string;
  };
}

// SortableCard Component for drag and drop
interface SortableCardProps {
  item: VacantPositionData;
  displayOrder: number;
  compact?: boolean;
  showOrder?: boolean; // เพิ่ม prop เพื่อควบคุมการแสดงลำดับ
  onViewDetail: (item: VacantPositionData) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, item: VacantPositionData) => void;
  onUnassign?: (item: VacantPositionData) => void; // เพิ่ม prop สำหรับยกเลิกการจับคู่
  draggedItem?: VacantPositionData | null; // เพิ่ม prop เพื่อรู้ว่า card ไหนกำลังลาก
  isAssignmentExpanded?: boolean; // เพิ่ม prop เพื่อควบคุมการขยายข้อมูลการจับคู่
  onToggleAssignment?: () => void; // เพิ่ม prop สำหรับ toggle
}

const SortableCard = React.memo(function SortableCard({ item, displayOrder, compact, showOrder = true, onViewDetail, onMenuOpen, onUnassign, draggedItem, isAssignmentExpanded, onToggleAssignment }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: item.id,
    // ปิด animation ของตำแหน่งอื่น
    animateLayoutChanges: () => false,
  });

  const style = {
    // ให้เฉพาะตัวที่ลากมี transform
    transform: isDragging ? CSS.Transform.toString(transform) : undefined,
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // ปิด transition จาก sx เพื่อไม่ให้ card อื่นขยับ
        transition: (isDragging || isOver) ? 'all 0.2s ease-out' : 'none',
        border: isOver ? 2 : 1,
        borderStyle: isOver ? 'dashed' : 'solid',
        borderColor: isOver 
          ? 'primary.main' 
          : (isDragging ? 'primary.main' : 'success.main'),
        // เพิ่ม border top สีเข้มสำหรับตำแหน่งที่จับคู่แล้ว
        borderTop: item.isAssigned ? 4 : undefined,
        borderTopColor: item.isAssigned ? 'success.dark' : undefined,
        backgroundColor: isOver 
          ? (theme) => alpha(theme.palette.primary.main, 0.08) 
          : 'background.paper',
        boxShadow: isDragging 
          ? '0 12px 40px rgba(0,0,0,0.15)' 
          : (isOver ? '0 4px 20px rgba(25, 118, 210, 0.2)' : 1),
        zIndex: isDragging ? 1000 : (isOver ? 100 : 1),
        '&:hover': {
          boxShadow: !isDragging && !isOver 
            ? (theme) => `0 12px 24px ${alpha(theme.palette.success.main, 0.15)}` 
            : undefined,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: compact ? 1 : 2 }}>
        {/* Drag Handle */}
        <Box 
          {...attributes}
          {...listeners}
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: compact ? 0.5 : 1, 
            opacity: 0.5,
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: compact ? 16 : 20, color: 'text.secondary' }} />
        </Box>

        {compact ? (
          // Compact View
          <>
            {/* ลำดับที่ และชื่อ */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {showOrder && (
                  <Chip
                    label={`#${displayOrder + 1}`}
                    size="small"
                    sx={{ 
                      bgcolor: 'primary.main',
                      color: 'white',
                      fontWeight: 700, 
                      fontSize: '0.75rem', 
                      height: 24,
                      borderRadius: '12px',
                      '& .MuiChip-label': {
                        px: 1,
                      }
                    }}
                  />
                )}
                <Typography variant="body2" fontWeight={700} sx={{ flex: 1, fontSize: '1rem' }}>
                  {item.rank ? `${item.rank} ${item.fullName || ''}` : (item.fullName || 'ว่าง')}
                </Typography>
              </Box>
              
              {/* ตำแหน่ง */}
              <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ fontSize: '0.9rem' }}>
                {item.position || 'ไม่ระบุตำแหน่ง'}
              </Typography>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {/* ตำแหน่งที่ขอ */}
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              ตำแหน่งที่ขอ:
            </Typography>
            <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ mb: 0.5, fontSize: '0.9rem' }}>
              {item.requestedPosCode 
                ? `${item.requestedPosCode.id} - ${item.requestedPosCode.name}` 
                : (item.requestedPosition || '-')}
            </Typography>

            {/* สถานะการจับคู่ */}
            {item.isAssigned && item.assignmentInfo && (
              <Box sx={{ mt: 1 }}>
                <Box 
                  onClick={onToggleAssignment}
                  sx={{ 
                    p: 0.75,
                    bgcolor: 'success.50',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'success.main',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': {
                      bgcolor: 'success.100',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="body2" color="success.dark" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
                      จับคู่แล้ว
                    </Typography>
                  </Box>
                  <ExpandMoreIcon 
                    sx={{ 
                      fontSize: 18,
                      color: 'success.main',
                      transform: isAssignmentExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                    }} 
                  />
                </Box>
                <Collapse in={isAssignmentExpanded}>
                  <Box sx={{ mt: 0.5, p: 1, bgcolor: 'success.50', borderRadius: 1, border: 1, borderColor: 'success.dark' }}>
                    <Typography variant="body2" color="text.primary" display="block" sx={{ fontSize: '0.85rem' }}>
                      ตำแหน่ง: {item.assignmentInfo.assignedPosition}
                    </Typography>
                    <Typography variant="body2" color="text.primary" display="block" sx={{ fontSize: '0.85rem' }}>
                      หน่วยงาน: {item.assignmentInfo.assignedUnit}
                    </Typography>
                    {item.assignmentInfo.assignedDate && (
                      <Typography variant="body2" color="text.primary" display="block" sx={{ fontSize: '0.85rem' }}>
                        วันที่: {new Date(item.assignmentInfo.assignedDate).toLocaleDateString('th-TH')}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* ผู้สนับสนุน */}
            {item.nominator && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.8rem' }}>
                ผู้สนับสนุน: <strong>{item.nominator}</strong>
              </Typography>
            )}

            {/* หมายเหตุ */}
            {item.notes && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'info.50', borderRadius: 1, border: 1, borderColor: 'info.light' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>
                  📝 หมายเหตุ:
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  {item.notes}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          // Full View
          <>
        {/* ลำดับที่, รหัสตำแหน่ง และ Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {showOrder && (
              <Chip
                label={`ลำดับที่ ${displayOrder + 1}`}
                size="small"
                sx={{ 
                  bgcolor: 'primary.main',
                  color: 'white',
                  fontWeight: 700, 
                  fontSize: '0.75rem',
                  borderRadius: '12px',
                  px: 0.5,
                }}
              />
            )}
            {item.posCodeMaster && (
              <Chip 
                label={`${item.posCodeMaster.id} - ${item.posCodeMaster.name}`} 
                size="small" 
                variant="outlined"
                sx={{ 
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  height: 24, 
                  fontSize: '0.7rem', 
                  fontWeight: 600,
                  borderRadius: '12px',
                  '& .MuiChip-label': {
                    px: 1,
                  }
                }}
              />
            )}
          </Box>
        </Box>

        {/* ยศ ชื่อ-สกุล */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <PersonIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.3 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              lineHeight: 1.4,
              color: 'text.primary',
              flex: 1,
            }}
          >
            {item.rank ? `${item.rank} ${item.fullName || ''}` : (item.fullName || 'ว่าง')}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* ตำแหน่ง */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <PositionIcon sx={{ fontSize: 18, color: 'primary.main', mt: 0.2 }} />
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              color: 'primary.main',
              lineHeight: 1.6,
              flex: 1,
            }}
          >
            {item.position || 'ไม่ระบุตำแหน่ง'}
          </Typography>
        </Box>

        {/* เลขตำแหน่ง */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            เลขตำแหน่ง: {item.positionNumber || '-'}
          </Typography>
        </Box>

        {/* คุณวุฒิ / อายุ / จำนวนปี / นรต. */}
        {(item.education || item.age || item.yearsOfService || item.trainingCourse) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
            {/* คุณวุฒิ */}
            {item.education && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EducationIcon sx={{ fontSize: 16, color: 'info.main' }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    lineHeight: 1.6,
                  }}
                >
                  {item.education}
                </Typography>
              </Box>
            )}

            {/* อายุ / จำนวนปี / นรต. */}
            {(item.age || item.yearsOfService || item.trainingCourse) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {item.age && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ServiceIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      อายุ {item.age}
                    </Typography>
                  </Box>
                )}
                {item.yearsOfService && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ServiceIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      จำนวนปี {item.yearsOfService}
                    </Typography>
                  </Box>
                )}
                {item.trainingCourse && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EducationIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      นรต.{item.trainingCourse}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* ทำหน้าที่ และ หน่วย */}
        {(item.actingAs || item.unit) && (
          <Box sx={{ mb: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {item.actingAs && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: item.unit ? 0.5 : 0 }}>
                ทำหน้าที่: {item.actingAs}
              </Typography>
            )}
            {item.unit && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                หน่วย: {item.unit}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ mb: 1.5 }} />

        {/* ตำแหน่งที่ขอ */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            ตำแหน่งที่ขอ
          </Typography>
          <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600, mt: 0.5 }}>
            {item.requestedPosCode 
              ? `${item.requestedPosCode.id} - ${item.requestedPosCode.name}` 
              : (item.requestedPosition || '-')}
          </Typography>
        </Box>

        {/* ผู้สนับสนุน */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            ผู้สนับสนุน
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, mt: 0.5 }}>
            {item.nominator || '-'}
          </Typography>
        </Box>

        {/* สถานะการจับคู่ - Full View */}
        {item.isAssigned && item.assignmentInfo && (
          <Box sx={{ mb: 1.5 }}>
            <Box 
              onClick={onToggleAssignment}
              sx={{ 
                p: 1.5,
                bgcolor: 'success.50',
                borderRadius: 2,
                border: 1,
                borderColor: 'success.main',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:hover': {
                  bgcolor: 'success.100',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon sx={{ fontSize: 20, color: 'success.main' }} />
                <Typography variant="body2" color="success.dark" fontWeight={700}>
                  จับคู่ตำแหน่งแล้ว
                </Typography>
              </Box>
              <ExpandMoreIcon 
                sx={{ 
                  fontSize: 20,
                  color: 'success.main',
                  transform: isAssignmentExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }} 
              />
            </Box>
            <Collapse in={isAssignmentExpanded}>
              <Box sx={{ mt: 1, p: 1.5, bgcolor: 'success.50', borderRadius: 2, border: 1, borderColor: 'success.light' }}>
                <Box sx={{ pl: 3.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                    ตำแหน่ง:
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mb: 0.5 }}>
                    {item.assignmentInfo.assignedPosition}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                    หน่วย:
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mb: 0.5 }}>
                    {item.assignmentInfo.assignedUnit}
                  </Typography>
                  {item.assignmentInfo.assignedDate && (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                        วันที่จับคู่:
                      </Typography>
                      <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {new Date(item.assignmentInfo.assignedDate).toLocaleDateString('th-TH')}
                      </Typography>
                    </>
                  )}
                  
                  {/* ข้อความแนะนำสำหรับการแก้ไข/ลบ */}
                  <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                      ไม่สามารถแก้ไขหรือลบได้ เนื่องจากได้จับคู่ตำแหน่งแล้ว
                    </Typography>
                  </Alert>

                  {/* ปุ่มยกเลิกการจับคู่ */}
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={<UnlinkIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnassign?.(item);
                      }}
                    >
                      ยกเลิกการจับคู่
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<ManageAccountsIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = '/police-personnel/vacant-position/assignment';
                      }}
                      sx={{ minWidth: 'auto', px: 1.5 }}
                    >
                      จัดการ
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* หมายเหตุ */}
        {item.notes && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.85rem' }}>
                <strong>หมายเหตุ:</strong> {item.notes}
              </Typography>
            </Alert>
          </Box>
        )}
          </>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Tooltip title="ดูรายละเอียด" leaveDelay={0} disableFocusListener>
          <IconButton
            size="small"
            onClick={() => onViewDetail(item)}
            sx={{
              border: 1,
              borderColor: 'primary.main',
              borderRadius: 2,
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
              }
            }}
          > 
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="เมนู" leaveDelay={0} disableFocusListener>
          <IconButton
            size="small"
            onClick={(e) => onMenuOpen(e, item)}
            sx={{
              border: 1,
              borderColor: 'grey.400',
              borderRadius: 2,
              '&:hover': {
                bgcolor: 'grey.100',
              }
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
});

// Skeleton Loading Components
const CardSkeleton = React.memo(function CardSkeleton() {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, pb: 2 }}>
        {/* Drag Indicator */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Skeleton variant="circular" width={20} height={20} />
        </Box>

        {/* ลำดับที่ & Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 3 }} />
          </Box>
          <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 3 }} />
        </Box>

        {/* ชื่อ */}
        <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={1} sx={{ mb: 1.5 }} />

        {/* ตำแหน่ง */}
        <Skeleton variant="text" width="90%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1.5 }} />

        {/* คุณวุฒิ */}
        <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="50%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="55%" height={20} sx={{ mb: 1.5 }} />

        {/* ข้อมูลเพิ่มเติม */}
        <Skeleton variant="rectangular" width="100%" height={1} sx={{ mb: 1.5 }} />
        <Skeleton variant="text" width="70%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} />
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton variant="circular" width={36} height={36} />
      </CardActions>
    </Card>
  );
});

const TableSkeleton = React.memo(function TableSkeleton() {
  return (
    <TableBody>
      {[...Array(5)].map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 3 }} /></TableCell>
          <TableCell><Skeleton variant="rectangular" width={150} height={24} sx={{ borderRadius: 3 }} /></TableCell>
          <TableCell><Skeleton variant="text" width="100%" /></TableCell>
          <TableCell><Skeleton variant="text" width="90%" /></TableCell>
          <TableCell><Skeleton variant="text" width="80%" /></TableCell>
          <TableCell><Skeleton variant="text" width="70%" /></TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </TableCell>
          <TableCell><Skeleton variant="text" width="85%" /></TableCell>
          <TableCell><Skeleton variant="text" width="75%" /></TableCell>
          <TableCell><Skeleton variant="text" width="90%" /></TableCell>
          <TableCell><Skeleton variant="text" width="80%" /></TableCell>
          <TableCell><Skeleton variant="text" width="70%" /></TableCell>
          <TableCell align="center">
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
});

export default function VacantPositionPage() {
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [data, setData] = useState<VacantPositionData[]>([]);
  const [filteredData, setFilteredData] = useState<VacantPositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [compactView, setCompactView] = useState(false); // Compact card view
  const [activeId, setActiveId] = useState<string | null>(null); // Active drag item
  const [draggedItem, setDraggedItem] = useState<VacantPositionData | null>(null); // ข้อมูลของ item ที่ลาก
  
  // Tab states
  const [selectedTab, setSelectedTab] = useState<number | 'all'>('all');
  const [positionGroups, setPositionGroups] = useState<Array<{ id: number; name: string; count: number }>>([]);
  
  // Filter states
  const [requestedPositionFilter, setRequestedPositionFilter] = useState<number | null>(null);
  const [requestedPositionOptions, setRequestedPositionOptions] = useState<Array<{ id: number; name: string }>>([]);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12); // Default for card view

  // Personnel detail modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<VacantPositionData | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<VacantPositionData | null>(null);

  // Assignment info expanded states - track which cards have expanded assignment info
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    nominator: string;
    requestedPositionId: number | null;
    notes: string;
  }>({
    nominator: '',
    requestedPositionId: null,
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VacantPositionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Swap confirmation states
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [swapData, setSwapData] = useState<{
    activeItem: VacantPositionData | null;
    overItem: VacantPositionData | null;
  }>({ activeItem: null, overItem: null });
  const [isSwapping, setIsSwapping] = useState(false);

  // Unassign confirmation states
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false);
  const [itemToUnassign, setItemToUnassign] = useState<VacantPositionData | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [unassignReason, setUnassignReason] = useState('');

  // PosCode options for edit
  const [posCodes, setPosCodes] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchAvailableYears();
    fetchPosCodes();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchData();
    }
  }, [selectedYear]);

  // Update filtered data and options when data changes
  useEffect(() => {
    if (!loading) {
      applyFilters();
      updateFilterOptions();
    }
  }, [data, requestedPositionFilter, selectedTab, loading]);

  // Generate available years (from 2568 to current year)
  const getAvailableYears = () => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  };

  const fetchAvailableYears = async () => {
    try {
      const years = getAvailableYears();
      setAvailableYears(years);
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchPosCodes = async () => {
    try {
      const response = await fetch('/api/police-personnel/pos-codes');
      const result = await response.json();
      if (result.success) {
        setPosCodes(result.data);
      }
    } catch (err) {
      console.error('Error fetching pos codes:', err);
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // หา item ที่กำลังลาก
    const item = data.find(d => d.id === event.active.id);
    setDraggedItem(item || null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedItem(null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null); // Reset active item
    setDraggedItem(null); // Reset dragged item

    if (over && active.id !== over.id) {
      // Get items being swapped from data array (not filtered)
      const activeItem = data.find(item => item.id === active.id);
      const overItem = data.find(item => item.id === over.id);
      
      if (!activeItem || !overItem) {
        console.error('Items not found:', { active: active.id, over: over.id });
        return;
      }

      // ตรวจสอบว่าทั้งสองรายการอยู่ในตำแหน่งเดียวกันหรือไม่
      if (activeItem.requestedPositionId !== overItem.requestedPositionId) {
        toast.error('ไม่สามารถลากข้ามกลุ่มตำแหน่งที่แตกต่างกันได้');
        return;
      }

      // เปิด dialog ยืนยัน
      setSwapData({ activeItem, overItem });
      setSwapConfirmOpen(true);
    }
  };

  // ยืนยันการสลับจาก Dialog
  const handleSwapConfirm = async () => {
    const { activeItem, overItem } = swapData;
    
    if (!activeItem || !overItem) return;

    setIsSwapping(true);

    try {
      // Get items in the same position group
      const groupItems = data.filter(item => item.requestedPositionId === activeItem.requestedPositionId);
      
      // Sort by current displayOrder within the group
      groupItems.sort((a, b) => {
        const aOrder = a.displayOrder !== null && a.displayOrder !== undefined ? a.displayOrder : 0;
        const bOrder = b.displayOrder !== null && b.displayOrder !== undefined ? b.displayOrder : 0;
        return aOrder - bOrder;
      });

      // Get current positions within the group
      const activeGroupIndex = groupItems.findIndex(item => item.id === activeItem.id);
      const overGroupIndex = groupItems.findIndex(item => item.id === overItem.id);

      // Debug log
      console.log('Swapping within group:', {
        groupId: activeItem.requestedPositionId,
        active: { id: activeItem.id, groupIndex: activeGroupIndex },
        over: { id: overItem.id, groupIndex: overGroupIndex }
      });

      // Swap positions within the group
      const newGroupItems = [...groupItems];
      [newGroupItems[activeGroupIndex], newGroupItems[overGroupIndex]] = 
      [newGroupItems[overGroupIndex], newGroupItems[activeGroupIndex]];

      // Update displayOrder for the group (1, 2, 3, 4...)
      newGroupItems.forEach((item, index) => {
        item.displayOrder = index + 1;
      });

      // Update in main data
      const newData = data.map(item => {
        const updatedGroupItem = newGroupItems.find(gi => gi.id === item.id);
        return updatedGroupItem || item;
      });

      setData(newData);

      // Update filtered data as well if item exists in filtered data
      const newFilteredData = filteredData.map(item => {
        const updatedGroupItem = newGroupItems.find(gi => gi.id === item.id);
        return updatedGroupItem || item;
      });

      setFilteredData(newFilteredData);

      // Send updated group items to API
      const updates = newGroupItems.map(item => ({
        id: item.id,
        displayOrder: item.displayOrder
      }));

      console.log('Sending to API:', updates);

      const response = await fetch('/api/vacant-position/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to update order');
      
      toast.success('อัปเดตลำดับเรียบร้อย');
      setSwapConfirmOpen(false);
      
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตลำดับ');
      // Revert on error
      setFilteredData(filteredData);
      setData(data);
    } finally {
      setIsSwapping(false);
    }
  };

  // ยกเลิกการสลับ
  const handleSwapCancel = () => {
    setSwapConfirmOpen(false);
    setSwapData({ activeItem: null, overItem: null });
  };

  // Optimize: Use useCallback and batch updates
  const autoAssignDisplayOrder = useCallback(async (data: VacantPositionData[]): Promise<VacantPositionData[]> => {
    // Group data by requestedPositionId
    const groupedData = data.reduce((acc, item) => {
      const groupId = item.requestedPositionId || 0;
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(item);
      return acc;
    }, {} as Record<number, VacantPositionData[]>);

    // Process each group
    const updatedItems: VacantPositionData[] = [];
    const itemsToUpdate: Array<{ id: string; displayOrder: number }> = [];

    for (const [groupId, groupItems] of Object.entries(groupedData)) {
      // Sort items in group by displayOrder (nulls last)
      groupItems.sort((a, b) => {
        if (a.displayOrder === null || a.displayOrder === undefined) return 1;
        if (b.displayOrder === null || b.displayOrder === undefined) return -1;
        return a.displayOrder - b.displayOrder;
      });

      // Assign displayOrder sequentially
      groupItems.forEach((item, index) => {
        if (item.displayOrder === null || item.displayOrder === undefined) {
          item.displayOrder = index + 1;
          itemsToUpdate.push({ id: item.id, displayOrder: item.displayOrder });
        }
      });

      updatedItems.push(...groupItems);
    }

    // Optimize: Batch update all items in one request if there are updates
    if (itemsToUpdate.length > 0) {
      try {
        // Could implement a batch update endpoint for better performance
        // For now, use Promise.all with limit to avoid overwhelming the server
        const batchSize = 10;
        for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
          const batch = itemsToUpdate.slice(i, i + batchSize);
          await Promise.all(
            batch.map(item =>
              fetch(`/api/vacant-position/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayOrder: item.displayOrder })
              })
            )
          );
        }
        console.log(`Updated displayOrder for ${itemsToUpdate.length} items`);
      } catch (error) {
        console.error('Error updating displayOrder:', error);
      }
    }

    return updatedItems;
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Clear data immediately when starting to load
      setData([]);
      setFilteredData([]);
      
      const response = await fetch(`/api/vacant-position?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      
      // Auto assign displayOrder for items that don't have it
      const dataWithDisplayOrder = await autoAssignDisplayOrder(result);
      
      // Sort by position group first, then by displayOrder within group
      const sortedData = dataWithDisplayOrder.sort((a: VacantPositionData, b: VacantPositionData) => {
        // First sort by requestedPositionId
        if (a.requestedPositionId !== b.requestedPositionId) {
          return (a.requestedPositionId || 0) - (b.requestedPositionId || 0);
        }
        // Then sort by displayOrder within the same group
        if (a.displayOrder === null || a.displayOrder === undefined) return 1;
        if (b.displayOrder === null || b.displayOrder === undefined) return -1;
        return a.displayOrder - b.displayOrder;
      });
      
      setData(sortedData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // Optimize: Use useCallback for filter options
  const updateFilterOptions = useCallback(() => {
    // Optimize: Use Map for faster lookups
    const positionMap = new Map<number, { id: number; name: string }>();
    
    data.forEach(item => {
      if (item.requestedPosCode && !positionMap.has(item.requestedPosCode.id)) {
        positionMap.set(item.requestedPosCode.id, item.requestedPosCode);
      }
    });
    
    const requestedPositions = Array.from(positionMap.values()).sort((a, b) => a.id - b.id);
    setRequestedPositionOptions(requestedPositions);
    
    // Update position groups for tabs
    updatePositionGroups();
  }, [data]);

  // Optimize: Use useCallback with memoization
  const updatePositionGroups = useCallback(() => {
    // Optimize: Use Map for O(1) lookup instead of array.find
    const groupMap = new Map<number, { id: number; name: string; count: number }>();
    
    data.forEach(item => {
      if (item.requestedPosCode) {
        const existing = groupMap.get(item.requestedPosCode.id);
        if (existing) {
          existing.count++;
        } else {
          groupMap.set(item.requestedPosCode.id, {
            id: item.requestedPosCode.id,
            name: item.requestedPosCode.name,
            count: 1
          });
        }
      }
    });
    
    // Convert to array and sort
    const groups = Array.from(groupMap.values()).sort((a, b) => a.id - b.id);
    setPositionGroups(groups);
    
    // Validate selectedTab - if current tab doesn't exist in groups, reset to 'all'
    if (selectedTab !== 'all') {
      const tabExists = groups.some(g => g.id === selectedTab);
      if (!tabExists) {
        setSelectedTab('all');
      }
    }
  }, [data, selectedTab]);

  // Optimize: Use useCallback for filter function
  const applyFilters = useCallback(() => {
    let filtered = [...data];

    // Apply tab filter
    if (selectedTab !== 'all') {
      filtered = filtered.filter(item => item.requestedPositionId === selectedTab);
    } else {
      // For "ทั้งหมด" tab, show only personnel who have requested positions
      filtered = filtered.filter(item => item.requestedPositionId !== null && item.requestedPositionId !== undefined);
    }

    // Apply additional filters
    if (requestedPositionFilter) {
      filtered = filtered.filter(item => item.requestedPositionId === requestedPositionFilter);
    }

    // Sort by position group first, then by displayOrder within group
    filtered.sort((a, b) => {
      // First sort by requestedPositionId
      if (a.requestedPositionId !== b.requestedPositionId) {
        return (a.requestedPositionId || 0) - (b.requestedPositionId || 0);
      }
      // Then sort by displayOrder within the same group
      const aOrder = a.displayOrder ?? 0;
      const bOrder = b.displayOrder ?? 0;
      return aOrder - bOrder;
    });

    setFilteredData(filtered);
    setPage(0); // Reset to first page when filters change
  }, [data, selectedTab, requestedPositionFilter]);

  const handleResetFilters = () => {
    setRequestedPositionFilter(null);
    setSelectedTab('all'); // Reset to all tab
    setPage(0);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number | 'all') => {
    setSelectedTab(newValue);
    // Clear position filter when changing tabs
    if (newValue !== 'all') {
      setRequestedPositionFilter(null);
    }
    setPage(0); // Reset to first page when tab changes
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'table' | 'card' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
      setPage(0);
      // Set appropriate rowsPerPage for each view
      if (newMode === 'table') {
        setRowsPerPage(10);
      } else {
        setRowsPerPage(12);
      }
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Get paginated data
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Calculate count of items with requested position for "ทั้งหมด" tab badge
  const totalRequestedCount = useMemo(() => {
    return data.filter(item => item.requestedPositionId !== null && item.requestedPositionId !== undefined).length;
  }, [data]);

  // Helper function to get display order within group
  const getGroupDisplayOrder = (item: VacantPositionData): number => {
    if (selectedTab === 'all') {
      // For 'all' tab, show global display order
      return (item.displayOrder ?? 0) + 1;
    } else {
      // For specific tab, calculate order within the group
      const groupItems = filteredData
        .filter(i => i.requestedPositionId === item.requestedPositionId)
        .sort((a, b) => {
          const aOrder = a.displayOrder ?? 0;
          const bOrder = b.displayOrder ?? 0;
          return aOrder - bOrder;
        });
      return groupItems.findIndex(i => i.id === item.id) + 1;
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    
    // ถ้าเป็นรูปแบบวันที่ไทยอยู่แล้ว (DD/MM/YYYY) ให้ return เลย
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        
        // ถ้าปีเป็น พ.ศ. (มากกว่า 2500) ให้ return เลย
        if (parseInt(year) > 2500) {
          return `${day}/${month}/${year}`;
        }
        
        // ถ้าปีเป็น ค.ศ. ให้แปลงเป็น พ.ศ.
        if (parseInt(year) > 1900 && parseInt(year) < 2100) {
          const thaiYear = parseInt(year) + 543;
          return `${day}/${month}/${thaiYear}`;
        }
      }
      
      return dateString;
    }
    
    // ถ้าเป็น ISO date string หรือ timestamp
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
        return `${day}/${month}/${year}`;
      }
    } catch (error) {
      return dateString;
    }
    
    return dateString;
  };

  const handleDelete = async (item: VacantPositionData) => {
    // Option 3: ตรวจสอบว่าจับคู่แล้วหรือไม่
    if (item.isAssigned) {
      toast.error('ไม่สามารถลบได้ เนื่องจากได้จับคู่ตำแหน่งแล้ว กรุณายกเลิกการจับคู่ก่อน');
      handleMenuClose();
      return;
    }

    setItemToDelete(item);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/vacant-position?nationalId=${itemToDelete.nationalId}&year=${itemToDelete.year}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      toast.success('ลบออกจากรายการยื่นขอตำแหน่งแล้ว');
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleEdit = useCallback((item: VacantPositionData) => {
    // Option 3: ตรวจสอบว่าจับคู่แล้วหรือไม่
    if (item.isAssigned) {
      toast.error('ไม่สามารถแก้ไขได้ เนื่องจากได้จับคู่ตำแหน่งแล้ว กรุณายกเลิกการจับคู่ก่อน');
      handleMenuClose();
      return;
    }

    setSelectedPersonnel(item);
    setEditFormData({
      nominator: item.nominator || '',
      requestedPositionId: item.requestedPositionId || null,
      notes: item.notes || '',
    });
    setEditModalOpen(true);
    handleMenuClose();
  }, [toast]);

  const handleEditClose = useCallback(() => {
    setEditModalOpen(false);
    setSelectedPersonnel(null);
    setEditFormData({
      nominator: '',
      requestedPositionId: null,
      notes: '',
    });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!selectedPersonnel) return;

    if (!editFormData.requestedPositionId) {
      toast.error('กรุณาเลือกตำแหน่งที่ขอ');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/vacant-position/${selectedPersonnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        toast.success('แก้ไขข้อมูลสำเร็จ');
        handleEditClose();
        fetchData();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setIsSaving(false);
    }
  }, [editFormData, selectedPersonnel, toast]);

  const handleViewDetail = useCallback((item: VacantPositionData) => {
    setSelectedPersonnel(item);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
  }, []);

  // Unassign handlers
  const handleUnassign = useCallback((item: VacantPositionData) => {
    if (!item.isAssigned) {
      toast.error('รายการนี้ยังไม่ได้จับคู่');
      return;
    }
    setItemToUnassign(item);
    setUnassignReason('');
    setUnassignConfirmOpen(true);
    handleMenuClose();
  }, [toast]);

  const handleUnassignCancel = useCallback(() => {
    setUnassignConfirmOpen(false);
    setItemToUnassign(null);
    setUnassignReason('');
  }, []);

  const handleUnassignConfirm = useCallback(async () => {
    if (!itemToUnassign) return;

    setIsUnassigning(true);
    try {
      const response = await fetch('/api/vacant-position/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: itemToUnassign.id,
          reason: unassignReason || 'ยกเลิกการจับคู่จากหน้ารายการยื่นขอตำแหน่ง',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('ยกเลิกการจับคู่สำเร็จ');
        setUnassignConfirmOpen(false);
        setItemToUnassign(null);
        setUnassignReason('');
        fetchData();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการยกเลิกการจับคู่');
      }
    } catch (error) {
      console.error('Unassign error:', error);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกการจับคู่');
    } finally {
      setIsUnassigning(false);
    }
  }, [itemToUnassign, unassignReason, toast]);

  // Toggle assignment info for a specific card
  const handleToggleAssignment = useCallback((itemId: string) => {
    setExpandedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, item: VacantPositionData) => {
    setAnchorEl(event.currentTarget);
    setMenuItem(item);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setMenuItem(null);
  }, []);

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                  รายการยื่นขอตำแหน่ง
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  จัดการและตรวจสอบรายการยื่นขอตำแหน่งของบุคลากร
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                aria-label="view mode"
              >
                <ToggleButton value="table" aria-label="table view">
                  <Tooltip title="มุมมองตาราง">
                    <ViewListIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="card" aria-label="card view">
                  <Tooltip title="มุมมองการ์ด">
                    <ViewModuleIcon />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Compact View Toggle - Show only in card view */}
              {viewMode === 'card' && (
                <Tooltip title={compactView ? "มุมมองเต็ม" : "มุมมองย่อ"}>
                  <IconButton
                    size="small"
                    onClick={() => setCompactView(!compactView)}
                    color={compactView ? "primary" : "default"}
                    sx={{ ml: 1 }}
                  >
                    {compactView ? <ViewComfyIcon /> : <ViewCompactIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, 
            gap: 2,
            alignItems: 'start'
          }}>
            <FormControl size="small">
              <InputLabel id="year-filter-label">ปีที่ยื่นขอตำแหน่ง</InputLabel>
              <Select
                labelId="year-filter-label"
                id="year-filter"
                value={selectedYear}
                label="ปีที่ยื่นขอตำแหน่ง"
                onChange={handleYearChange}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* Show filter only when "All" tab is selected */}
              {selectedTab === 'all' && (
                <Autocomplete
                  fullWidth
                  options={requestedPositionOptions}
                  value={requestedPositionOptions.find(opt => opt.id === requestedPositionFilter) || null}
                  onChange={(event, newValue) => setRequestedPositionFilter(newValue?.id || null)}
                  getOptionLabel={(option) => `${option.id} - ${option.name}`}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="ตำแหน่งที่ขอ" 
                      placeholder="เลือกตำแหน่งที่ขอ..."
                      size="small"
                    />
                  )}
                  noOptionsText="ไม่พบข้อมูล"
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                />
              )}
              {requestedPositionFilter && selectedTab === 'all' && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleResetFilters}
                  startIcon={<RefreshIcon />}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  ล้างตัวกรอง
                </Button>
              )}
              {selectedTab !== 'all' && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  กำลังแสดงรายการสำหรับตำแหน่ง: {positionGroups.find(g => g.id === selectedTab)?.name}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Position Tabs */}
        {!loading && positionGroups.length > 0 && (
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-indicator': {
                  height: 3,
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  minHeight: 56,
                  px: 3,
                },
              }}
            >
              <Tab 
                value="all"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'inherit' }}>
                      ทั้งหมด
                    </Typography>
                    <Chip
                      label={totalRequestedCount}
                      size="small"
                      sx={{
                        backgroundColor: (theme) => theme.palette.primary.main,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: 22,
                        minWidth: 22,
                        borderRadius: '11px',
                        '& .MuiChip-label': {
                          px: 0.8,
                        }
                      }}
                    />
                  </Box>
                }
              />
              {positionGroups.map((group) => (
                <Tab
                  key={group.id}
                  value={group.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600, 
                          color: 'inherit',
                          lineHeight: 1.2,
                        }}
                      >
                        {group.id} - {group.name}
                      </Typography>
                      <Chip
                        label={group.count}
                        size="small"
                        variant="outlined"
                        sx={{
                          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.1),
                          borderColor: (theme) => theme.palette.secondary.main,
                          color: (theme) => theme.palette.secondary.main,
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          height: 22,
                          minWidth: 22,
                          borderRadius: '11px',
                          '& .MuiChip-label': {
                            px: 0.8,
                          },
                          // Animation on hover
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.2),
                            transform: 'scale(1.05)',
                          }
                        }}
                      />
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Paper>
        )}

        {/* Content */}
        {loading ? (
          <>
            {/* Skeleton Loading */}
            {viewMode === 'table' ? (
              <Paper elevation={2}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        {selectedTab !== 'all' && (
                          <TableCell sx={{ color: 'white', fontWeight: 600, width: 80 }}>ลำดับที่</TableCell>
                        )}
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>รหัสตำแหน่ง</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ยศ-ชื่อ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่ง</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>เลขตำแหน่ง</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>คุณวุฒิ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>อายุ/ปีรับราชการ/นรต.</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ทำหน้าที่</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>หน่วย</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ผู้สนับสนุน</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่งที่ขอ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>หมายเหตุ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600, width: 120 }} align="center">จัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableSkeleton />
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(2, 1fr)', 
                  md: 'repeat(3, 1fr)', 
                  lg: 'repeat(4, 1fr)' 
                }, 
                gap: 3 
              }}>
                {[...Array(12)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </Box>
            )}
          </>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <Fade in={!loading} timeout={800}>
                <Paper sx={{ borderRadius: 2 }}>
                  <EmptyState
                    icon={VacantIcon}
                    title={
                      selectedTab !== 'all' 
                        ? `ไม่พบรายการยื่นขอตำแหน่ง ${positionGroups.find(g => g.id === selectedTab)?.name || ''}`
                        : requestedPositionFilter 
                          ? 'ไม่พบข้อมูลที่ตรงกับการกรอง' 
                          : 'ไม่พบรายการยื่นขอตำแหน่ง'
                    }
                    description={
                      selectedTab !== 'all'
                        ? 'ยังไม่มีบุคลากรยื่นขอตำแหน่งนี้ในปีที่เลือก'
                        : requestedPositionFilter 
                          ? 'ลองปรับเปลี่ยนตัวกรองหรือล้างตัวกรอง' 
                          : `ยังไม่มีรายการยื่นขอตำแหน่งในปี ${selectedYear}`
                    }
                  />
                </Paper>
              </Fade>
            ) : (
              <>
                {/* Table View */}
                {viewMode === 'table' ? (
                  <Paper elevation={2}>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'primary.main' }}>
                            {selectedTab !== 'all' && (
                              <TableCell sx={{ color: 'white', fontWeight: 600, width: 80 }}>ลำดับที่</TableCell>
                            )}
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>รหัสตำแหน่ง</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ยศ-ชื่อ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่ง</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>เลขตำแหน่ง</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>คุณวุฒิ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>อายุ/ปีรับราชการ/นรต.</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ทำหน้าที่</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>หน่วย</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ผู้สนับสนุน</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่งที่ขอ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>หมายเหตุ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600, width: 120 }} align="center">จัดการ</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedData.map((item, index) => (
                            <TableRow 
                              key={item.id}
                              hover
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: 'action.hover'
                                }
                              }}
                            >
                              {selectedTab !== 'all' && (
                                <TableCell>
                                  <Chip
                                    label={getGroupDisplayOrder(item)}
                                    size="small"
                                    sx={{ 
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      fontWeight: 700,
                                      minWidth: 32,
                                      height: 24,
                                      borderRadius: '12px',
                                      '& .MuiChip-label': {
                                        px: 1,
                                      }
                                    }}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                {item.posCodeMaster ? (
                                  <Chip 
                                    label={`${item.posCodeMaster.id} - ${item.posCodeMaster.name}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                      borderColor: 'info.main',
                                      color: 'info.main',
                                      bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                                      fontWeight: 600, 
                                      fontSize: '0.75rem',
                                      height: 26,
                                      borderRadius: '13px',
                                      '& .MuiChip-label': {
                                        px: 1.2,
                                      }
                                    }}
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.rank ? `${item.rank} ${item.fullName || ''}` : (item.fullName || 'ว่าง')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {item.position || 'ไม่ระบุตำแหน่ง'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.positionNumber || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.education || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {item.age && (
                                    <Typography variant="caption" color="text.secondary">
                                      อายุ {item.age}
                                    </Typography>
                                  )}
                                  {item.yearsOfService && (
                                    <Typography variant="caption" color="text.secondary">
                                      {item.yearsOfService}
                                    </Typography>
                                  )}
                                  {item.trainingCourse && (
                                    <Typography variant="caption" color="text.secondary">
                                      นรต.{item.trainingCourse}
                                    </Typography>
                                  )}
                                  {!item.age && !item.yearsOfService && !item.trainingCourse && (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.actingAs || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.unit || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                                  {item.nominator || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 500 }}>
                                  {item.requestedPosCode 
                                    ? `${item.requestedPosCode.id} - ${item.requestedPosCode.name}` 
                                    : (item.requestedPosition || '-')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {item.isAssigned && item.assignmentInfo ? (
                                  <Tooltip 
                                    title={
                                      <Box>
                                        <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                                          จับคู่แล้ว
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                          {item.assignmentInfo.assignedPosition}
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                          {item.assignmentInfo.assignedUnit}
                                        </Typography>
                                        <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic', color: 'warning.light' }}>
                                          ไม่สามารถแก้ไข/ลบได้
                                        </Typography>
                                      </Box>
                                    }
                                  >
                                    <Chip
                                      icon={<CheckIcon sx={{ fontSize: 16 }} />}
                                      label="จับคู่แล้ว"
                                      size="small"
                                      color="success"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </Tooltip>
                                ) : (
                                  <Chip
                                    label="รอจับคู่"
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    sx={{ fontWeight: 600 }}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    maxWidth: 150,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {item.notes || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                  <Tooltip title="ดูรายละเอียด">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleViewDetail(item)}
                                    >
                                      <InfoOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="เมนู">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleMenuOpen(e, item)}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination for Table View */}
                    {filteredData.length > 0 && (
                      <DataTablePagination
                        count={filteredData.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50, 100]}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        variant="minimal"
                      />
                    )}
                  </Paper>
                ) : (
                  /* Card View with Drag and Drop */
                  <>
                    {/* Info Alert for Drag and Drop */}
                    <Alert 
                      severity="info" 
                      icon={<DragIndicatorIcon />}
                      sx={{ mb: 3 }}
                    >
                      <Typography variant="body2">
                        <strong>เคล็ดลับ:</strong> คลิกและลากการ์ดเพื่อจัดเรียงลำดับความสำคัญได้ 
                        (การลากจะสลับลำดับของทั้งสองการ์ด และสามารถลากได้เฉพาะภายในกลุ่มตำแหน่งเดียวกันเท่านั้น)
                      </Typography>
                    </Alert>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragCancel={handleDragCancel}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={paginatedData.map(item => item.id)}
                        strategy={rectSortingStrategy}
                      >
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: { 
                            xs: '1fr', 
                            sm: 'repeat(2, 1fr)', 
                            md: 'repeat(3, 1fr)', 
                            lg: 'repeat(4, 1fr)' 
                          }, 
                          gap: 3 
                        }}>
                          {paginatedData.map((item, index) => (
                            <SortableCard 
                              key={item.id}
                              item={item}
                              displayOrder={getGroupDisplayOrder(item) - 1}
                              compact={compactView}
                              showOrder={selectedTab !== 'all'}
                              onViewDetail={handleViewDetail}
                              onMenuOpen={handleMenuOpen}
                              onUnassign={handleUnassign}
                              draggedItem={draggedItem}
                              isAssignmentExpanded={expandedAssignments.has(item.id)}
                              onToggleAssignment={() => handleToggleAssignment(item.id)}
                            />
                          ))}
                        </Box>
                      </SortableContext>
                      <DragOverlay
                        dropAnimation={{
                          sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                              active: {
                                opacity: '0.5',
                              },
                            },
                          }),
                        }}
                      >
                        {activeId ? (
                          <Card
                            sx={{
                              cursor: 'grabbing',
                              transform: 'rotate(5deg)',
                              boxShadow: 8,
                              opacity: 0.9,
                            }}
                          >
                            <CardContent>
                              <Typography variant="h6" color="primary">
                                กำลังย้าย...
                              </Typography>
                            </CardContent>
                          </Card>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  
                    {/* Pagination for Card View */}
                    {filteredData.length > 0 && (
                      <Paper sx={{ mt: 3 }}>
                        <DataTablePagination
                          count={filteredData.length}
                          page={page}
                          rowsPerPage={rowsPerPage}
                          rowsPerPageOptions={[8, 12, 16, 24, 48]}
                          onPageChange={handlePageChange}
                          onRowsPerPageChange={handleRowsPerPageChange}
                          variant="minimal"
                        />
                      </Paper>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Personnel Detail Modal */}
        <PersonnelDetailModal 
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          personnel={selectedPersonnel}
          loading={loadingPersonnel}
          onClearData={() => setSelectedPersonnel(null)}
        />

        {/* More Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {/* Option 1: ซ่อนปุ่ม Edit/Delete เมื่อจับคู่แล้ว */}
          <MenuItem 
            onClick={() => menuItem && handleEdit(menuItem)}
            disabled={menuItem?.isAssigned}
          >
            <ListItemIcon>
              <EditIcon 
                fontSize="small" 
                color={menuItem?.isAssigned ? "disabled" : "primary"} 
              />
            </ListItemIcon>
            <ListItemText>
              {menuItem?.isAssigned ? 'แก้ไข (จับคู่แล้ว)' : 'แก้ไข'}
            </ListItemText>
          </MenuItem>
          <MenuItem 
            onClick={() => menuItem && handleDelete(menuItem)}
            disabled={menuItem?.isAssigned}
          >
            <ListItemIcon>
              <DeleteIcon 
                fontSize="small" 
                color={menuItem?.isAssigned ? "disabled" : "error"} 
              />
            </ListItemIcon>
            <ListItemText>
              {menuItem?.isAssigned ? 'ลบ (จับคู่แล้ว)' : 'ลบ'}
            </ListItemText>
          </MenuItem>
          
          {/* ปุ่มยกเลิกการจับคู่ - แสดงเฉพาะเมื่อจับคู่แล้ว */}
          {menuItem?.isAssigned && (
            <>
              <Divider />
              <MenuItem 
                onClick={() => menuItem && handleUnassign(menuItem)}
              >
                <ListItemIcon>
                  <UnlinkIcon 
                    fontSize="small" 
                    color="warning" 
                  />
                </ListItemIcon>
                <ListItemText>
                  ยกเลิกการจับคู่
                </ListItemText>
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Edit Modal */}
        <Dialog 
          open={editModalOpen} 
          onClose={handleEditClose} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              width: { xs: '100%'},
              height: { xs: '100%', sm: 'auto' },
              maxHeight: { xs: '100%', sm: '90vh' },
              margin: { xs: 0, sm: '32px' },
              borderRadius: { xs: 0, sm: 1 },
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 1, 
            borderBottom: 1, 
            borderColor: 'divider',
            flexShrink: 0
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon color="action" />
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                แก้ไขข้อมูลยื่นขอตำแหน่ง
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ 
            pt: 2, 
            mt: 2,
            flex: 1,
            overflow: 'auto',
            px: { xs: 2, sm: 3 },
            minHeight: 0
          }}>
            <Stack spacing={2.5}>
              {/* แสดงข้อมูลบุคลากร */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  บุคลากร
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {selectedPersonnel?.rank} {selectedPersonnel?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ตำแหน่ง: {selectedPersonnel?.position || '-'}
                </Typography>
              </Box>

              
              {/* ตำแหน่งที่ขอ */}
              <FormControl fullWidth required>
                <InputLabel>ตำแหน่งที่ขอ</InputLabel>
                <Select
                  value={editFormData.requestedPositionId || ''}
                  label="ตำแหน่งที่ขอ"
                  onChange={(e) => setEditFormData({ ...editFormData, requestedPositionId: Number(e.target.value) })}
                  size="small"
                >
                  <MenuItem value="">
                    <em>-- เลือกตำแหน่งที่ต้องการขอ --</em>
                  </MenuItem>
                  {posCodes.map((posCode) => (
                    <MenuItem key={posCode.id} value={posCode.id}>
                      {posCode.id} - {posCode.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* ผู้สนับสนุน */}
              <TextField
                fullWidth
                label="ผู้สนับสนุน"
                placeholder="ระบุชื่อผู้สนับสนุน/ผู้เสนอชื่อ"
                value={editFormData.nominator}
                onChange={(e) => setEditFormData({ ...editFormData, nominator: e.target.value })}
                size="small"
              />


              {/* หมายเหตุ */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="หมายเหตุ (ถ้ามี)"
                placeholder="เช่น เหตุผล, ข้อมูลเพิ่มเติม..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                size="small"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ 
            px: { xs: 2, sm: 2 }, 
            py: { xs: 2, sm: 1.5 }, 
            bgcolor: 'grey.50', 
            borderTop: 1, 
            borderColor: 'divider',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            flexShrink: 0,
            '& .MuiButton-root': {
              minWidth: { xs: '100%', sm: 120 }
            }
          }}>
            <Button 
              onClick={handleEditClose} 
              variant="outlined" 
              size="medium"
              disabled={isSaving}
              sx={{ order: { xs: 2, sm: 1 } }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              size="medium"
              disabled={isSaving || !editFormData.requestedPositionId}
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Swap Confirmation Dialog */}
        <Dialog
          open={swapConfirmOpen}
          onClose={() => !isSwapping && handleSwapCancel()}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: 'auto' },
              height: { xs: '100%', sm: 'auto' },
              maxHeight: { xs: '100%', sm: '90vh' },
              margin: { xs: 0, sm: '32px' },
              borderRadius: { xs: 0, sm: 1 },
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <DialogTitle sx={{ flexShrink: 0 }}>ยืนยันการสลับลำดับความสำคัญ</DialogTitle>
          <DialogContent
            sx={{
              flex: 1,
              overflow: 'auto',
              px: { xs: 2, sm: 3 },
              minHeight: 0
            }}
          >
            <Typography variant="body1" sx={{ mb: 3 }}>
              คุณต้องการสลับลำดับความสำคัญระหว่าง:
            </Typography>
            
            <Stack spacing={2}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.main' }}>
                <Typography variant="subtitle2" color="primary.main" gutterBottom>
                  ลำดับที่ {swapData.activeItem 
                    ? getGroupDisplayOrder(swapData.activeItem)
                    : '-'}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {swapData.activeItem?.rank} {swapData.activeItem?.fullName || 'ไม่ระบุชื่อ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ตำแหน่งที่ขอ: {swapData.activeItem?.requestedPosCode?.name || 'ไม่ระบุ'}
                </Typography>
              </Paper>

              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h4" color="primary.main">⇅</Typography>
              </Box>

              <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: 1, borderColor: 'secondary.main' }}>
                <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                  ลำดับที่ {swapData.overItem 
                    ? getGroupDisplayOrder(swapData.overItem)
                    : '-'}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {swapData.overItem?.rank} {swapData.overItem?.fullName || 'ไม่ระบุชื่อ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ตำแหน่งที่ขอ: {swapData.overItem?.requestedPosCode?.name || 'ไม่ระบุ'}
                </Typography>
              </Paper>
            </Stack>

            <Alert severity="info" sx={{ mt: 3 }}>
              การสลับลำดับจะส่งผลต่อความสำคัญในการพิจารณาตำแหน่ง
            </Alert>
          </DialogContent>
          <DialogActions sx={{ 
            px: { xs: 2, sm: 3 }, 
            py: { xs: 2, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            flexShrink: 0,
            '& .MuiButton-root': {
              minWidth: { xs: '100%', sm: 'auto' }
            }
          }}>
            <Button 
              onClick={handleSwapCancel} 
              disabled={isSwapping}
              sx={{ order: { xs: 2, sm: 1 } }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSwapConfirm} 
              color="primary" 
              variant="contained"
              disabled={isSwapping}
              startIcon={isSwapping ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {isSwapping ? 'กำลังสลับ...' : 'ยืนยันการสลับ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => !isDeleting && handleDeleteCancel()}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: 'auto' },
              height: { xs: '100%', sm: 'auto' },
              maxHeight: { xs: '100%', sm: '90vh' },
              margin: { xs: 0, sm: '32px' },
              borderRadius: { xs: 0, sm: 1 },
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <DialogTitle sx={{ flexShrink: 0 }}>ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent
            sx={{
              flex: 1,
              overflow: 'auto',
              px: { xs: 2, sm: 3 },
              minHeight: 0
            }}
          >
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการลบรายการยื่นขอตำแหน่ง{' '}
              {itemToDelete?.rank && itemToDelete?.fullName && (
                <>
                  ของ <strong>{itemToDelete.rank} {itemToDelete.fullName}</strong>
                </>
              )}{' '}
              ใช่หรือไม่?
            </Typography>
            <Typography variant="body2" color="error">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions sx={{ 
            px: { xs: 2, sm: 3 }, 
            py: { xs: 2, sm: 1.5 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            flexShrink: 0,
            '& .MuiButton-root': {
              minWidth: { xs: '100%', sm: 'auto' }
            }
          }}>
            <Button 
              onClick={handleDeleteCancel} 
              disabled={isDeleting}
              sx={{ order: { xs: 2, sm: 1 } }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {isDeleting ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Unassign Confirmation Dialog */}
        <Dialog
          open={unassignConfirmOpen}
          onClose={() => !isUnassigning && handleUnassignCancel()}
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '500px' },
              height: { xs: '100%', sm: 'auto' },
              maxHeight: { xs: '100%', sm: '90vh' },
              margin: { xs: 0, sm: '32px' },
              borderRadius: { xs: 0, sm: 1 },
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <DialogTitle sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            <UnlinkIcon color="warning" />
            ยืนยันการยกเลิกจับคู่
          </DialogTitle>
          <DialogContent
            sx={{
              flex: 1,
              overflow: 'auto',
              px: { xs: 2, sm: 3 },
              minHeight: 0
            }}
          >
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการยกเลิกการจับคู่{' '}
              {itemToUnassign?.rank && itemToUnassign?.fullName && (
                <>
                  ของ <strong>{itemToUnassign.rank} {itemToUnassign.fullName}</strong>
                </>
              )}{' '}
              ใช่หรือไม่?
            </Typography>

            {itemToUnassign?.assignmentInfo && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  ตำแหน่งที่จับคู่ปัจจุบัน:
                </Typography>
                <Typography variant="body2">
                  {itemToUnassign.assignmentInfo.assignedPosition}
                </Typography>
                <Typography variant="body2">
                  {itemToUnassign.assignmentInfo.assignedUnit}
                </Typography>
              </Alert>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label="เหตุผลในการยกเลิก (ไม่บังคับ)"
              value={unassignReason}
              onChange={(e) => setUnassignReason(e.target.value)}
              placeholder="ระบุเหตุผลในการยกเลิกการจับคู่..."
              sx={{ mb: 2 }}
            />

            <Alert severity="warning">
              <Typography variant="body2">
                การยกเลิกจับคู่จะไม่ลบข้อมูล แต่จะเปลี่ยนสถานะเป็น "รอจับคู่" 
                และสามารถจับคู่ใหม่ได้ในภายหลัง
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ 
            px: { xs: 2, sm: 3 }, 
            py: { xs: 2, sm: 1.5 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            flexShrink: 0,
            '& .MuiButton-root': {
              minWidth: { xs: '100%', sm: 'auto' }
            }
          }}>
            <Button 
              onClick={handleUnassignCancel} 
              disabled={isUnassigning}
              sx={{ order: { xs: 2, sm: 1 } }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleUnassignConfirm} 
              color="warning" 
              variant="contained"
              disabled={isUnassigning}
              startIcon={isUnassigning ? <CircularProgress size={20} color="inherit" /> : <UnlinkIcon />}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {isUnassigning ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกจับคู่'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
