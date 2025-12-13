"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Drawer,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Alert
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import DataTablePagination from '@/components/DataTablePagination';
import { alpha } from '@mui/material/styles';

interface VacantPosition {
  id: string;
  posCodeId: number;
  posCodeName?: string;
  position: string;
  unit: string;
  positionNumber?: string;
  requestedPositionId?: number;
  requestedPosition?: string;
}

interface PromotionChainVacantSelectorProps {
  selectedYear: number;
  isMobile: boolean;
  open?: boolean;
  onClose?: () => void;
  onSelectVacant?: (vacant: VacantPosition) => void;
}

export default function PromotionChainVacantSelector({ 
  selectedYear, 
  isMobile, 
  open: controlledOpen,
  onClose: controlledOnClose,
  onSelectVacant 
}: PromotionChainVacantSelectorProps) {
  // Drawer state - ใช้ controlled ถ้ามี props มา ไม่งั้นใช้ internal state
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
    resetFilters();
  };
  const [loadingVacant, setLoadingVacant] = useState(false);
  const [vacantPositions, setVacantPositions] = useState<VacantPosition[]>([]);
  const [totalVacantPositions, setTotalVacantPositions] = useState(0);

  // Filters & pagination
  const [searchText, setSearchText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterPosCode, setFilterPosCode] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);

  const resetFilters = () => {
    setSearchText('');
    setSearchInput('');
    setFilterPosCode('all');
    setFilterUnit('all');
    setPage(0);
  };

  const loadVacantPositions = useCallback(async () => {
    setLoadingVacant(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        unassignedOnly: 'true'
      });
      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }
      const response = await fetch(`/api/vacant-position/available?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData?.error || 'Failed to fetch vacant positions');
      }
      const result = await response.json();
      const flatPositions: VacantPosition[] = [];
      const posCodeSet = new Set<string>();
      result.groups.forEach((group: any) => {
        if (group.posCodeId && group.posCodeName) {
          posCodeSet.add(JSON.stringify({ id: group.posCodeId, name: group.posCodeName }));
        }
        group.positions.forEach((pos: any) => {
          flatPositions.push({
            id: pos.id,
            posCodeId: group.posCodeId,
            posCodeName: group.posCodeName,
            position: pos.position,
            unit: pos.unit,
            positionNumber: pos.positionNumber,
            requestedPositionId: group.posCodeId,
            requestedPosition: group.posCodeName
          });
        });
      });
      // Collect unit options
      const unitSet = new Set<string>();
      flatPositions.forEach(v => { if (v.unit) unitSet.add(v.unit); });
      setUnitOptions(Array.from(unitSet).sort((a,b) => a.localeCompare(b,'th')));
      // Collect pos code options
      const posCodeList = Array.from(posCodeSet).map(str => JSON.parse(str)).sort((a,b) => a.id - b.id);
      setPosCodeOptions(posCodeList);
      // Client filters
      let filtered = flatPositions;
      if (filterUnit !== 'all') filtered = filtered.filter(v => v.unit === filterUnit);
      if (filterPosCode !== 'all') filtered = filtered.filter(v => {
        const id = v.requestedPositionId ?? v.posCodeId;
        return id !== undefined && id !== null && id.toString() === filterPosCode;
      });
      // Pagination
      const start = page * rowsPerPage;
      const end = start + rowsPerPage;
      setVacantPositions(filtered.slice(start, end));
      setTotalVacantPositions(filtered.length);
    } catch (e) {
      console.error('Failed to load vacant positions:', e);
      setVacantPositions([]);
      setTotalVacantPositions(0);
    } finally {
      setLoadingVacant(false);
    }
  }, [selectedYear, searchText, filterUnit, filterPosCode, page, rowsPerPage]);

  useEffect(() => {
    if (open) loadVacantPositions();
  }, [open, loadVacantPositions]);

  const handleSelect = (vp: VacantPosition) => {
    if (onSelectVacant) onSelectVacant(vp);
    else alert(`คุณเลือก: ${vp.position}\nหน่วย: ${vp.unit}\n(ต่อไปจะเชื่อม workflow promotion-chain)`);
    handleClose();
  };

  return (
    <>
      {controlledOpen === undefined && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="medium"
          onClick={() => {
            resetFilters();
            setInternalOpen(true);
          }}
          sx={{ textTransform: 'none' }}
        >
          เพิ่มรายการตำแหน่งว่าง
        </Button>
      )}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        ModalProps={{ sx: { zIndex: 10001 } }}
        PaperProps={{ sx: { width: { xs: '100%', sm: '90%', md: 700 }, backgroundImage: 'none' } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 10 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.25rem' } }}>เลือกตำแหน่งว่าง</Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: { xs: 1, sm: 1.5 }, borderBottom: 1, borderColor: 'divider' }}>
            <Stack spacing={1}>
              <TextField
                placeholder="ค้นหาตำแหน่ง, หน่วย..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setSearchText(searchInput); setPage(0); } }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  endAdornment: searchInput && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearchInput(''); setSearchText(''); setPage(0); }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1, pt: 1 }}>
                <FormControl size="small">
                  <InputLabel>หน่วย</InputLabel>
                  <Select value={filterUnit} label="หน่วย" onChange={(e) => { setFilterUnit(e.target.value); setPage(0); }} MenuProps={{ PaperProps: { style: { maxHeight: 300 } }, sx: { zIndex: 10002 } }}>
                    <MenuItem value="all"><Typography variant="body2">ทุกหน่วย</Typography></MenuItem>
                    {unitOptions.map(unit => <MenuItem key={unit} value={unit}><Typography variant="body2" noWrap>{unit}</Typography></MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small">
                  <InputLabel>ตำแหน่ง</InputLabel>
                  <Select value={filterPosCode} label="ตำแหน่ง" onChange={(e) => { setFilterPosCode(e.target.value); setPage(0); }} MenuProps={{ PaperProps: { style: { maxHeight: 300 } }, sx: { zIndex: 10002 } }}>
                    <MenuItem value="all"><Typography variant="body2">ทุกระดับ</Typography></MenuItem>
                    {posCodeOptions.map(pc => <MenuItem key={pc.id} value={pc.id.toString()}><Typography variant="body2" fontWeight={600} noWrap>{pc.id} - {pc.name}</Typography></MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              {(searchText || filterPosCode !== 'all' || filterUnit !== 'all') && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">พบ {totalVacantPositions} ตำแหน่ง</Typography>
                  <Button size="small" onClick={() => { resetFilters(); }} sx={{ minWidth: 'auto', textTransform: 'none', fontSize: '0.75rem', py: 0.25 }}>ล้างตัวกรอง</Button>
                </Box>
              )}
            </Stack>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 1.5 }, position: 'relative' }}>
            {loadingVacant && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.8)', zIndex: 1 }}>
                <CircularProgress size={isMobile ? 40 : 48} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>กำลังโหลดข้อมูล...</Typography>
              </Box>
            )}
            {vacantPositions.length === 0 && !loadingVacant ? (
              <Alert severity="warning" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                {(searchText || filterPosCode !== 'all' || filterUnit !== 'all') ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : <>ไม่มีตำแหน่งว่างที่พร้อมใช้งานในปี {selectedYear}</>}
              </Alert>
            ) : (
              <List disablePadding sx={{ opacity: loadingVacant ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                {vacantPositions.map(vp => (
                  <ListItem key={vp.id} disablePadding sx={{ mb: 0.5 }}>
                    <Paper elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 0.75, overflow: 'hidden', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main', boxShadow: 1, bgcolor: 'action.hover' } }}>
                      <ListItemButton onClick={() => handleSelect(vp)} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                            <Chip label={vp.requestedPosition || 'ไม่ระบุ'} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem', '& .MuiChip-label': { px: 0.75 } }} />
                            <Typography variant="caption" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{vp.position || '-'}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', lineHeight: 1.2 }}>หน่วย: {vp.unit || '-'}{vp.positionNumber ? ` - เลขที่ ${vp.positionNumber}` : ''}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28, borderRadius: 0.75, bgcolor: 'primary.50', color: 'primary.main' }}>
                          <AddIcon sx={{ fontSize: 18 }} />
                        </Box>
                      </ListItemButton>
                    </Paper>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          {!loadingVacant && totalVacantPositions > 0 && (
            <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', zIndex: 10002, pt: { xs: 1, sm: 1.5 }, pb: { xs: 1, sm: 1.5 } }}>
              <DataTablePagination
                count={totalVacantPositions}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(newPage: number) => setPage(newPage)}
                onRowsPerPageChange={(newRpp: number) => { setRowsPerPage(newRpp); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                variant="minimal"
                menuZIndex={10003}
              />
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
}
