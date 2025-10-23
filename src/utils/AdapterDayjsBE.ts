import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';

export class AdapterDayjsBE extends AdapterDayjs {
  constructor({ locale, formats }: { locale?: string; formats?: any } = {}) {
    super({ locale: locale || 'th', formats });
  }

  // Override formatByString to handle Buddhist Era year
  formatByString = (value: Dayjs, formatString: string): string => {
    if (!this.isValid(value)) {
      return '';
    }

    // Replace BBBB with Buddhist Era year
    const beYear = value.year() + 543;
    let result = formatString;
    
    // Handle BBBB format (Buddhist Era)
    if (formatString.includes('BBBB')) {
      result = result.replace(/BBBB/g, beYear.toString());
      // Format the rest using dayjs
      result = value.format(result);
    } else if (formatString.includes('YYYY')) {
      // Also replace YYYY with Buddhist Era year for consistency
      result = value.format(formatString);
      result = result.replace(new RegExp(value.year().toString(), 'g'), beYear.toString());
    } else {
      result = value.format(formatString);
    }
    
    return result;
  };

  // Override getYearText to show Buddhist Era year in calendar
  getYearText = (date: Dayjs): string => {
    return `${date.year() + 543}`;
  };
}

