'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  TextField,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  alpha,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Slide,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as ArrowDownIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/Layout';
import DataTablePagination from '@/components/DataTablePagination';

// Types
interface ChainNode {
  id: string;
  nodeOrder: number;
  personnelId?: string;
  nationalId: string;
  fullName: string;
  rank: string;
  seniority?: string;
  fromPosCodeId: number;
  fromPosition: string;
  fromPositionNumber?: string;
  fromUnit: string;
  toPosCodeId: number;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
}

interface PromotionChain {
  id: string;
  year: number;
  chainNumber: string;
  status: 'draft' | 'approved' | 'completed' | 'cancelled';
  originVacantPositionId: string;
  originPosCodeId: number;
  originPosition: string;
  originUnit: string;
  totalNodes: number;
  nodes: ChainNode[];
  createdAt: string;
  createdBy?: string;
}

interface VacantPosition {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  positionNumber?: string;
  requestedPositionId?: number;
  requestedPosition?: string;
}

interface SwapListPerson {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
}

const RANK_HIERARCHY = [
  { rankName: 'รอง ผบ.ตร.', rankLevel: 1 },
  { rankName: 'ผู้ช่วย', rankLevel: 2 },
  { rankName: 'ผบช.', rankLevel: 3 },
  { rankName: 'รอง ผบช.', rankLevel: 4 },
  { rankName: 'ผบก.', rankLevel: 6 },
  { rankName: 'รอง ผบก.', rankLevel: 7 },
  { rankName: 'ผกก.', rankLevel: 8 },
  { rankName: 'รอง ผกก.', rankLevel: 9 },
  { rankName: 'สว.', rankLevel: 11 },
  { rankName: 'รอง สว.', rankLevel: 12 },
];

export default function PromotionChainPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [chains, setChains] = useState<PromotionChain[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // Compact drawer header height (px) for sticky calculations
  const drawerHeaderHeight = 56;
  const [vacantPositions, setVacantPositions] = useState<VacantPosition[]>([]);
  const [allVacantPositions, setAllVacantPositions] = useState<VacantPosition[]>([]); // เก็บข้อมูลทั้งหมด
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 543);
  
  // Pagination for drawer
  const [drawerPage, setDrawerPage] = useState(0);
  const [drawerRowsPerPage, setDrawerRowsPerPage] = useState(10);
  
  // Filter for drawer
  const [searchText, setSearchText] = useState('');
  const [filterPosCode, setFilterPosCode] = useState<string>('all');
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);

  // Load chains
  useEffect(() => {
    loadChains();
    loadVacantPositions();
  }, [selectedYear]);

  const loadChains = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call
      // const response = await fetch(`/api/promotion-chain?year=${selectedYear}`);
      // const data = await response.json();
      // setChains(data);
      
      // Mock data for demonstration
      setChains([]);
    } catch (error) {
      console.error('Error loading chains:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVacantPositions = async () => {
    try {
      const response = await fetch(`/api/vacant-position/available?year=${selectedYear}&unassignedOnly=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vacant positions');
      }
      
      const data = await response.json();
      
      // แปลง grouped data เป็น flat list สำหรับ dialog
      const flatPositions: VacantPosition[] = [];
      const posCodeSet = new Set<string>();
      
      data.groups.forEach((group: any) => {
        // เก็บ posCode options
        if (group.posCodeId && group.posCodeName) {
          posCodeSet.add(JSON.stringify({ id: group.posCodeId, name: group.posCodeName }));
        }
        
        group.positions.forEach((pos: any) => {
          flatPositions.push({
            id: pos.id,
            posCodeId: group.posCodeId,
            position: pos.position,
            unit: pos.unit,
            positionNumber: pos.positionNumber,
            requestedPositionId: group.posCodeId,
            requestedPosition: group.posCodeName,
          });
        });
      });
      
      // แปลง Set เป็น Array
      const posCodeList = Array.from(posCodeSet).map(item => JSON.parse(item));
      setPosCodeOptions(posCodeList);
      
      setAllVacantPositions(flatPositions);
      setVacantPositions(flatPositions);
    } catch (error) {
      console.error('Error loading vacant positions:', error);
      setAllVacantPositions([]);
      setVacantPositions([]);
      setPosCodeOptions([]);
    }
  };

  // Filter function
  const applyFilters = () => {
    let filtered = [...allVacantPositions];
    
    // Filter by search text
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(vp => 
        vp.position?.toLowerCase().includes(search) ||
        vp.unit?.toLowerCase().includes(search) ||
        vp.requestedPosition?.toLowerCase().includes(search) ||
        (vp.positionNumber ? String(vp.positionNumber).toLowerCase().includes(search) : false)
      );
    }
    
    // Filter by posCode
    if (filterPosCode !== 'all') {
      filtered = filtered.filter(vp => vp.posCodeId?.toString() === filterPosCode);
    }
    
    setVacantPositions(filtered);
    setDrawerPage(0); // Reset to first page
  };

  // Apply filters when search or filter changes
  useEffect(() => {
    applyFilters();
  }, [searchText, filterPosCode, allVacantPositions]);

  const handleCreateChain = () => {
    setShowCreateDialog(false);
    router.push('/police-personnel/promotion-chain/create');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'approved': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'ร่าง';
      case 'approved': return 'อนุมัติแล้ว';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

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
            <Box>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon />
                จัดคนเข้าตำแหน่งว่าง (Vacant Position Filling)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                จัดบุคลากรเข้าตำแหน่งว่างแบบทอดต่อ เมื่อมีตำแหน่งว่างและต้องการเลือกคนมาแทนตามลำดับชั้น
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateDialog(true)}
            >
              สร้างรายการใหม่
            </Button>
          </Box>
        </Paper>

      {/* Year Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          select
          label="ปีงบประมาณ"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {[2568, 2567, 2566].map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>การจัดคนเข้าตำแหน่งว่างคืออะไร?</strong>
        </Typography>
        <Typography variant="body2">
          เมื่อมีตำแหน่งว่าง (เช่น ผกก-นครปฐม) และเลือกคนมาแทน (เช่น รอง ผบก.-ราชบุรี)
          ตำแหน่งเดิมของเขา (ผบก.-ราชบุรี) จะว่างลง ต้องหาคนมาแทนต่อ (เช่น ผกก.-สมุทรสาคร)
          และทำต่อเนื่องจนถึงระดับล่างสุดที่กำหนด
        </Typography>
      </Alert>

      {/* Chains List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : chains.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            ยังไม่มีรายการ
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            เริ่มต้นจัดคนเข้าตำแหน่งว่างแรกของคุณ
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            สร้าง Chain ใหม่
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chains.map((chain) => (
            <Card key={chain.id} sx={{ '&:hover': { boxShadow: 4 } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {chain.chainNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ตำแหน่งต้นทาง: <strong>{chain.originPosition}</strong> ({chain.originUnit})
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip
                      label={getStatusLabel(chain.status)}
                      color={getStatusColor(chain.status) as any}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      จำนวน: {chain.totalNodes} ขั้น
                    </Typography>
                  </Box>
                </Box>

                {/* Chain Preview */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  flexWrap: 'wrap',
                  p: 2,
                  bgcolor: alpha('#000', 0.02),
                  borderRadius: 1,
                }}>
                  {chain.nodes.map((node, index) => (
                    <React.Fragment key={node.id}>
                      <Chip
                        label={`${node.rank} ${node.fullName}`}
                        size="small"
                        variant="outlined"
                      />
                      {index < chain.nodes.length - 1 && (
                        <ArrowDownIcon fontSize="small" color="action" />
                      )}
                    </React.Fragment>
                  ))}
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => router.push(`/police-personnel/promotion-chain/${chain.id}`)}
                  >
                    ดูรายละเอียด
                  </Button>
                  {chain.status === 'draft' && (
                    <>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => router.push(`/police-personnel/promotion-chain/${chain.id}/edit`)}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                      >
                        ลบ
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Drawer */}
      <Drawer
        anchor="right"
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        ModalProps={{
          sx: {
            zIndex: 1400, // สูงกว่า AppBar (1200)
          }
        }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: '90%', md: 700 },
            backgroundImage: 'none',
          }
        }}
        SlideProps={{
          timeout: { enter: 300, exit: 250 }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{ 
            p: 1, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}>
            <Box sx={{ lineHeight: 1 , pl:1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                จับคู่ตำแหน่งว่าง • พบ {vacantPositions.length} ตำแหน่งว่าง
              </Typography>
              
            </Box>
            <IconButton onClick={() => setShowCreateDialog(false)} size="small">
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* Search and Filter */}
          <Box sx={{ 
            p: 1, 
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: drawerHeaderHeight, // ความสูงของ header ที่ย่อขนาด
            zIndex: 10, // เพิ่ม zIndex ให้สูงกว่า
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}>
            <Stack spacing={1}>
              {/* Search and Filter in one row */}
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  placeholder="ค้นหา..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
                />
                
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={filterPosCode}
                    onChange={(e: SelectChangeEvent) => setFilterPosCode(e.target.value)}
                    displayEmpty
                    renderValue={(selected) => {
                      if (selected === 'all') {
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FilterListIcon fontSize="small" />
                            <Typography variant="body2">ทั้งหมด</Typography>
                          </Box>
                        );
                      }
                      const posCode = posCodeOptions.find(p => p.id.toString() === selected);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FilterListIcon fontSize="small" />
                          <Typography variant="body2">{posCode?.name || selected}</Typography>
                        </Box>
                      );
                    }}
                    MenuProps={{
                      // Ensure the popover/menu renders above Drawer and sticky bars
                      sx: { zIndex: 9999 },
                      PaperProps: {
                        sx: {
                          zIndex: 9999,
                          maxHeight: 300,
                        }
                      },
                      disablePortal: false,
                      anchorOrigin: {
                        vertical: 'bottom',
                        horizontal: 'left',
                      },
                      transformOrigin: {
                        vertical: 'top',
                        horizontal: 'left',
                      },
                    }}
                    sx={{
                      '& .MuiSelect-select': {
                        py: 1,
                      }
                    }}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    {posCodeOptions.map((posCode) => (
                      <MenuItem key={posCode.id} value={posCode.id.toString()}>
                        {posCode.id} - {posCode.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              
              {(searchText || filterPosCode !== 'all') && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  px: 0.5,
                }}>
                  <Typography variant="caption" color="text.secondary">
                    {vacantPositions.length}/{allVacantPositions.length} รายการ
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      setSearchText('');
                      setFilterPosCode('all');
                    }}
                    sx={{ 
                      minWidth: 'auto', 
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      py: 0.25,
                    }}
                  >
                    ล้าง
                  </Button>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={32} />
              </Box>
            ) : vacantPositions.length === 0 ? (
              <Alert severity="warning" sx={{ fontSize: '0.875rem' }}>
                {(searchText || filterPosCode !== 'all') 
                  ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา'
                  : <>ไม่มีตำแหน่งว่างที่พร้อมใช้งานในปี {selectedYear}</>
                }
              </Alert>
            ) : (
              <List disablePadding>
                {vacantPositions
                  .slice(drawerPage * drawerRowsPerPage, drawerPage * drawerRowsPerPage + drawerRowsPerPage)
                  .map((vp) => (
                    <ListItem
                      key={vp.id}
                      disablePadding
                      sx={{ mb: 0.5 }}
                    >
                      <Paper 
                        elevation={0}
                        sx={{ 
                          width: '100%',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 0.75,
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 1,
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemButton
                          onClick={() => {
                            router.push(`/police-personnel/promotion-chain/create?vacantId=${vp.id}`);
                            setShowCreateDialog(false);
                          }}
                          sx={{ 
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {/* Content - Ultra Compact Layout */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                              <Chip 
                                label={vp.requestedPosition || 'ไม่ระบุ'} 
                                size="small" 
                                color="primary"
                                sx={{ 
                                  height: 18,
                                  fontSize: '0.85rem',
                                  '& .MuiChip-label': { px: 0.75 }
                                }}
                              />
                              <Typography 
                                variant="caption" 
                                fontWeight={600}
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.85rem',
                                }}
                              >
                                {vp.position || '-'}
                              </Typography>
                            </Box>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ 
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.8rem',
                                lineHeight: 1.2,
                              }}
                            >
                                หน่วย: {vp.unit || '-'}{vp.positionNumber ? ` - เลขที่ ${vp.positionNumber}` : ''}
                            </Typography>
                          </Box>
                          
                          {/* Action Icon - Smaller */}
                          <Box sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 28,
                            height: 28,
                            borderRadius: 0.75,
                            bgcolor: 'primary.50',
                            color: 'primary.main',
                          }}>
                            <AddIcon sx={{ fontSize: 18 }} />
                          </Box>
                        </ListItemButton>
                      </Paper>
                    </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Footer with Pagination */}
          {vacantPositions.length > 0 && (
            <DataTablePagination
              count={vacantPositions.length}
              page={drawerPage}
              rowsPerPage={drawerRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              onPageChange={(newPage) => setDrawerPage(newPage)}
              onRowsPerPageChange={(newRowsPerPage) => {
                setDrawerRowsPerPage(newRowsPerPage);
                setDrawerPage(0);
              }}
              variant="minimal"
              dense
              showLabel={false}
              sx={{ py: { xs: 0.75, sm: 1 } }}
            />
          )}
        </Box>
      </Drawer>
      </Box>
    </Layout>
  );
}
